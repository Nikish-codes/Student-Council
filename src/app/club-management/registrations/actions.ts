"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { attendees, auditLog, events } from "@/db/schema";
import { requireClubMembership } from "@/lib/club-access";
import { newId } from "@/lib/tickets";
import { eventIsHostedByClub } from "@/lib/event-hosts";

export async function toggleClubAttendance(
  clubId: number,
  eventId: number,
  attendeeId: string,
) {
  const { user } = await requireClubMembership(clubId, "manage_events");
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });
  const attendee = await db.query.attendees.findFirst({
    where: and(eq(attendees.id, attendeeId), eq(attendees.eventId, eventId)),
  });
  if (!event || !(await eventIsHostedByClub(eventId, clubId)) || !attendee)
    throw new Error("NOT_FOUND");
  const checkedInAt = attendee.checkedInAt ? null : new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx
      .update(attendees)
      .set({
        checkedInAt,
        checkedInByUserId: checkedInAt ? Number(user.id) : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(attendees.id, attendee.id));
    await tx.insert(auditLog).values({
      id: newId(),
      actorUserId: Number(user.id),
      clubId,
      eventId,
      action: checkedInAt
        ? "attendance.checked_in"
        : "attendance.check_in_reversed",
      targetId: attendee.id,
    });
  });
  revalidatePath(`/club-management/registrations/${eventId}`);
}
