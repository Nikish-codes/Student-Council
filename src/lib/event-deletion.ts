import "server-only";

import { and, eq, inArray, or } from "drizzle-orm";

import { db } from "@/db/client";
import {
  announcements,
  attendees,
  auditLog,
  contentRevisions,
  eventClubs,
  eventFollowupTasks,
  eventRegistrations,
  events,
  homepageConfig,
  notifications,
  recaps,
} from "@/db/schema";
import { newId } from "@/lib/tickets";

export async function deleteEventEverywhere(input: {
  eventId: number;
  actorUserId: number;
}) {
  return db.transaction(async (tx) => {
    const event = await tx.query.events.findFirst({
      where: eq(events.id, input.eventId),
    });
    if (!event) throw new Error("NOT_FOUND");

    const registrationRows = await tx
      .select({ id: eventRegistrations.id })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, event.id));
    const recapRows = await tx
      .select({ id: recaps.id })
      .from(recaps)
      .where(eq(recaps.eventId, event.id));
    const registrationIds = registrationRows.map((row) => row.id);
    const recapIds = recapRows.map((row) => row.id);

    // Unpin first so the homepage never retains a deleted foreign key.
    await tx
      .update(homepageConfig)
      .set({ flagshipEventId: null })
      .where(eq(homepageConfig.flagshipEventId, event.id));

    // Ticket delivery rows depend on registrations, and attendees depend on
    // both registrations and the event, so remove them from the leaves inward.
    if (registrationIds.length) {
      await tx
        .delete(notifications)
        .where(inArray(notifications.registrationId, registrationIds));
    }
    await tx.delete(attendees).where(eq(attendees.eventId, event.id));
    await tx
      .delete(eventRegistrations)
      .where(eq(eventRegistrations.eventId, event.id));

    await tx
      .delete(eventFollowupTasks)
      .where(eq(eventFollowupTasks.eventId, event.id));
    await tx.delete(announcements).where(eq(announcements.eventId, event.id));

    // Revisions do not have a database foreign key, so clear both the event
    // snapshots and any follow-up snapshots attached to its recap records.
    await tx
      .delete(contentRevisions)
      .where(
        recapIds.length
          ? or(
              and(
                eq(contentRevisions.entityType, "event"),
                eq(contentRevisions.entityId, event.id),
              ),
              and(
                eq(contentRevisions.entityType, "event_followup"),
                inArray(contentRevisions.entityId, recapIds),
              ),
            )
          : and(
              eq(contentRevisions.entityType, "event"),
              eq(contentRevisions.entityId, event.id),
            ),
      );
    await tx.delete(recaps).where(eq(recaps.eventId, event.id));

    // Existing event-specific audit rows hold a restrictive foreign key. Keep
    // accountability by replacing them with one detached deletion record.
    await tx.delete(auditLog).where(eq(auditLog.eventId, event.id));
    await tx.delete(eventClubs).where(eq(eventClubs.eventId, event.id));
    await tx.delete(events).where(eq(events.id, event.id));
    await tx.insert(auditLog).values({
      id: newId(),
      actorUserId: input.actorUserId,
      eventId: null,
      clubId: event.clubId,
      action: "event.deleted",
      targetId: String(event.id),
      meta: {
        title: event.title,
        slug: event.slug,
        deletedRegistrations: registrationIds.length,
        deletedRecaps: recapIds.length,
      },
    });

    return {
      id: event.id,
      slug: event.slug,
      clubId: event.clubId,
      title: event.title,
    };
  });
}
