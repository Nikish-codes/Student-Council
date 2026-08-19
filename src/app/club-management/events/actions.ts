"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { events } from "@/db/schema";
import { requireClubMembership } from "@/lib/club-access";
import { requireStudioClub } from "@/lib/club-studio";
import {
  eventSnapshotSchema,
  saveRevisionDraft,
  submitRevision,
} from "@/lib/revisions";
import { uniqueSlug, slugify } from "@/lib/slug";
import {
  eventIsHostedByClub,
  hostingClubIdsFromForm,
  replaceEventHostingClubs,
} from "@/lib/event-hosts";

const s = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const optNum = (fd: FormData, key: string) =>
  s(fd, key) ? Number(s(fd, key)) : null;

async function snapshotFromForm(
  formData: FormData,
  clubId: number,
  eventId?: number,
) {
  const existing = eventId
    ? await db.query.events.findFirst({ where: eq(events.id, eventId) })
    : null;
  const requested = s(formData, "slug") || s(formData, "title");
  const slug =
    existing && slugify(requested) === existing.slug
      ? existing.slug
      : await uniqueSlug("events", requested, eventId);
  // The active club is enforced server-side even if a client tampers with the
  // disabled checkbox or omits it entirely.
  const clubIds = hostingClubIdsFromForm(formData, clubId);
  return eventSnapshotSchema.parse({
    title: s(formData, "title"),
    slug,
    category: s(formData, "category"),
    date: s(formData, "date"),
    endDate: s(formData, "endDate") || null,
    venue: s(formData, "venue"),
    excerpt: s(formData, "excerpt"),
    description: s(formData, "description"),
    bannerId: optNum(formData, "bannerId"),
    videoUrl: s(formData, "videoUrl") || null,
    registrationUrl: s(formData, "registrationUrl") || null,
    attendees: optNum(formData, "attendees"),
    featured: existing?.featured ?? false,
    clubId,
    clubIds,
    registrationEnabled: formData.get("registrationEnabled") === "on",
    priceInPaise: Math.max(
      0,
      Math.round(Number(s(formData, "priceRupees") || 0) * 100),
    ),
    capacity: optNum(formData, "capacity"),
  });
}

export async function createClubEvent(formData: FormData) {
  const active = await requireStudioClub(s(formData, "clubId"));
  const { user } = await requireClubMembership(active.clubId, "manage_events");
  const snapshot = await snapshotFromForm(formData, active.clubId);
  const { clubIds, ...eventFields } = snapshot;
  const event = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(events)
      .values({
        ...eventFields,
        status: "draft",
        version: 0,
        organizerId: Number(user.id),
      })
      .returning({ id: events.id });
    await replaceEventHostingClubs(tx, created.id, clubIds);
    return created;
  });
  const revisionId = await saveRevisionDraft({
    entityType: "event",
    entityId: event.id,
    clubId: active.clubId,
    baseVersion: 0,
    snapshot,
  });
  if (s(formData, "status") === "pending_review")
    await submitRevision(revisionId);
  revalidatePath("/club-management/events");
  redirect(`/club-management/events?club=${active.clubId}`);
}

export async function updateClubEvent(eventId: number, formData: FormData) {
  const active = await requireStudioClub(s(formData, "clubId"));
  await requireClubMembership(active.clubId, "manage_events");
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });
  if (!event || !(await eventIsHostedByClub(event.id, active.clubId))) {
    throw new Error("NOT_FOUND");
  }
  const snapshot = await snapshotFromForm(formData, active.clubId, eventId);
  const revisionId = await saveRevisionDraft({
    revisionId: s(formData, "revisionId") || undefined,
    entityType: "event",
    entityId: event.id,
    clubId: active.clubId,
    baseVersion: event.version,
    snapshot,
  });
  if (s(formData, "status") === "pending_review")
    await submitRevision(revisionId);
  revalidatePath("/club-management/events");
  redirect(`/club-management/events?club=${active.clubId}`);
}
