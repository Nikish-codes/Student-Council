"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db/client";
import { revalidateClubPages } from "@/lib/revalidate-club";
import {
  events as eventsT,
  homepageConfig as homepageT,
  type EventStatus,
} from "@/db/schema";
import {
  assertCanEditEvent,
  canPublish,
  isAdmin,
  requireOps,
  requireRole,
} from "@/lib/rbac";
import { uniqueSlug, slugify } from "@/lib/slug";
import { onEventPublished } from "@/lib/automation/on-publish";
import { logAudit } from "@/lib/audit";
import { saveRevisionDraft, submitRevision } from "@/lib/revisions";
import {
  getEventHostingClubIds,
  hostingClubIdsFromForm,
  primaryHostingClubId,
  replaceEventHostingClubs,
} from "@/lib/event-hosts";
import type { EventCategory } from "@/lib/schemas";
import { resolveEventFeatured } from "@/lib/event-featured";
import { deleteEventEverywhere } from "@/lib/event-deletion";

const CATEGORIES: EventCategory[] = [
  "tech",
  "cultural",
  "sports",
  "flagship",
  "academic",
  "community",
];
const STATUSES: EventStatus[] = [
  "draft",
  "pending_review",
  "published",
  "archived",
];

function s(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}
function optNum(fd: FormData, k: string): number | null {
  const v = s(fd, k);
  return v === "" ? null : Number(v);
}

type ParsedEvent = {
  title: string;
  category: EventCategory;
  date: string;
  endDate: string | null;
  venue: string;
  excerpt: string;
  description: string;
  bannerId: number | null;
  videoUrl: string | null;
  registrationUrl: string | null;
  attendees: number | null;
  featured: boolean;
  clubId: number | null;
  clubIds: number[];
  registrationEnabled: boolean;
  priceInPaise: number;
  capacity: number | null;
};

function parse(
  fd: FormData,
  options: {
    preferredClubId?: number | null;
    canFeature: boolean;
    existingFeatured?: boolean | null;
  },
): ParsedEvent {
  const category = s(fd, "category") as EventCategory;
  const rupees = Number(s(fd, "priceRupees") || 0);
  const clubIds = hostingClubIdsFromForm(fd);
  return {
    title: s(fd, "title"),
    category: CATEGORIES.includes(category) ? category : "tech",
    date: s(fd, "date"),
    endDate: s(fd, "endDate") || null,
    venue: s(fd, "venue"),
    excerpt: s(fd, "excerpt"),
    description: s(fd, "description"),
    bannerId: optNum(fd, "bannerId"),
    videoUrl: s(fd, "videoUrl") || null,
    registrationUrl: s(fd, "registrationUrl") || null,
    attendees: optNum(fd, "attendees"),
    featured: resolveEventFeatured({
      requested: fd.get("featured") === "on",
      existing: options.existingFeatured,
      canFeature: options.canFeature,
    }),
    clubId: primaryHostingClubId(clubIds, options.preferredClubId),
    clubIds,
    registrationEnabled: fd.get("registrationEnabled") === "on",
    priceInPaise: Number.isFinite(rupees) ? Math.round(rupees * 100) : 0,
    capacity: optNum(fd, "capacity"),
  };
}

/** Resolve the requested status against the user's publishing rights. */
function resolveStatus(
  requested: string,
  role: Parameters<typeof canPublish>[0],
) {
  const status = (
    STATUSES.includes(requested as EventStatus) ? requested : "draft"
  ) as EventStatus;
  // Non-publishers cannot publish directly — their "publish" becomes a review request.
  if (status === "published" && !canPublish(role)) return "pending_review";
  return status;
}

export async function createEvent(fd: FormData) {
  const user = await requireOps();
  const data = parse(fd, { canFeature: isAdmin(user.role) });

  // Club leads can only create events for their own club.
  const clubId = data.clubId;
  assertCanEditEvent(user, clubId);
  const { clubIds, ...eventData } = data;

  const status = resolveStatus(s(fd, "status"), user.role);
  const slug = await uniqueSlug("events", s(fd, "slug") || data.title);

  if (!canPublish(user.role)) {
    if (!clubId) throw new Error("CLUB_REQUIRED_FOR_REVIEW");
    const event = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(eventsT)
        .values({
          ...eventData,
          clubId,
          slug,
          status: "draft",
          organizerId: Number(user.id),
          version: 0,
        })
        .returning({ id: eventsT.id });
      await replaceEventHostingClubs(tx, created.id, clubIds);
      return created;
    });
    const revisionId = await saveRevisionDraft({
      entityType: "event",
      entityId: event.id,
      clubId: clubId!,
      baseVersion: 0,
      snapshot: { ...eventData, slug, clubId, clubIds },
    });
    if (status === "pending_review") await submitRevision(revisionId);
    revalidatePath("/management/events");
    redirect("/management/events");
  }

  const row = await db.transaction(async (tx) => {
    if (status === "published" && eventData.featured) {
      await tx
        .update(eventsT)
        .set({ featured: false })
        .where(eq(eventsT.status, "published"));
    }
    const [created] = await tx
      .insert(eventsT)
      .values({
        ...eventData,
        clubId,
        slug,
        status,
        organizerId: Number(user.id),
        publishedAt: status === "published" ? new Date().toISOString() : null,
        version: status === "published" ? 1 : 0,
      })
      .returning({ id: eventsT.id });
    await replaceEventHostingClubs(tx, created.id, clubIds);
    if (status === "published" && eventData.featured) {
      await tx
        .update(homepageT)
        .set({ flagshipEventId: created.id })
        .where(eq(homepageT.id, 1));
    }
    return created;
  });

  if (status === "published") await onEventPublished(row.id);
  await logAudit({
    actorUserId: Number(user.id),
    eventId: row.id,
    clubId,
    action: status === "published" ? "event.direct_published" : "event.created",
    targetId: String(row.id),
  });

  revalidatePath("/management/events");
  // The club page lists its own events, so it goes stale on every event write.
  await revalidateClubPages(clubId, ...clubIds);
  redirect("/management/events");
}

export async function updateEvent(id: number, fd: FormData) {
  const user = await requireOps();
  const existing = await db.query.events.findFirst({
    where: eq(eventsT.id, id),
  });
  if (!existing) throw new Error("NOT_FOUND");
  assertCanEditEvent(user, existing.clubId);

  const data = parse(fd, {
    preferredClubId: existing.clubId,
    canFeature: isAdmin(user.role),
    existingFeatured: existing.featured,
  });
  const clubId = data.clubId;
  const { clubIds, ...eventData } = data;
  const status = resolveStatus(s(fd, "status"), user.role);

  // Re-slug only if the slug field changed (keep existing otherwise).
  const requestedSlug = s(fd, "slug");
  const slug =
    requestedSlug && slugify(requestedSlug) !== existing.slug
      ? await uniqueSlug("events", requestedSlug, id)
      : existing.slug;

  if (!canPublish(user.role)) {
    if (!clubId) throw new Error("CLUB_REQUIRED_FOR_REVIEW");
    const revisionId = await saveRevisionDraft({
      entityType: "event",
      entityId: existing.id,
      clubId,
      baseVersion: existing.version,
      snapshot: { ...eventData, slug, clubId, clubIds },
    });
    if (status === "pending_review") await submitRevision(revisionId);
    revalidatePath("/management/events");
    redirect("/management/events");
  }

  const justPublished =
    status === "published" && existing.status !== "published";

  const previousClubIds = await getEventHostingClubIds(id);
  await db.transaction(async (tx) => {
    if (status === "published" && eventData.featured) {
      await tx
        .update(eventsT)
        .set({ featured: false })
        .where(and(eq(eventsT.status, "published"), ne(eventsT.id, id)));
    }
    await tx
      .update(eventsT)
      .set({
        ...eventData,
        clubId,
        slug,
        status,
        publishedAt:
          justPublished && !existing.publishedAt
            ? new Date().toISOString()
            : existing.publishedAt,
        updatedAt: new Date().toISOString(),
        version: existing.version + 1,
      })
      .where(eq(eventsT.id, id));
    await replaceEventHostingClubs(tx, id, clubIds);
    if (status === "published" && eventData.featured) {
      await tx
        .update(homepageT)
        .set({ flagshipEventId: id })
        .where(eq(homepageT.id, 1));
    } else {
      await tx
        .update(homepageT)
        .set({ flagshipEventId: null })
        .where(eq(homepageT.flagshipEventId, id));
    }
  });

  if (justPublished) await onEventPublished(id);
  await logAudit({
    actorUserId: Number(user.id),
    eventId: id,
    clubId,
    action: "event.direct_published",
    targetId: String(id),
    meta: { previousVersion: existing.version },
  });

  revalidatePath("/management/events");
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/events/${slug}`);
  // Both clubs when the event was reassigned, so neither list is left stale.
  await revalidateClubPages(
    existing.clubId,
    clubId,
    ...previousClubIds,
    ...clubIds,
  );
  redirect("/management/events");
}

/** One-click publish from the approval queue (publishers only). */
export async function publishEvent(id: number) {
  const user = await requireRole("super_admin", "operations");
  const existing = await db.query.events.findFirst({
    where: eq(eventsT.id, id),
  });
  if (!existing) throw new Error("NOT_FOUND");

  await db.transaction(async (tx) => {
    if (existing.featured) {
      await tx
        .update(eventsT)
        .set({ featured: false })
        .where(and(eq(eventsT.status, "published"), ne(eventsT.id, id)));
    }
    await tx
      .update(eventsT)
      .set({
        status: "published",
        publishedAt: existing.publishedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: existing.version + 1,
      })
      .where(eq(eventsT.id, id));
    if (existing.featured) {
      await tx
        .update(homepageT)
        .set({ flagshipEventId: id })
        .where(eq(homepageT.id, 1));
    } else {
      await tx
        .update(homepageT)
        .set({ flagshipEventId: null })
        .where(eq(homepageT.flagshipEventId, id));
    }
  });

  await onEventPublished(id);
  await logAudit({
    actorUserId: Number(user.id),
    eventId: id,
    clubId: existing.clubId,
    action: "event.direct_published",
    targetId: String(id),
  });
  revalidatePath("/management/events");
  await revalidateClubPages(existing.clubId);
}

export async function deleteEvent(id: number) {
  const user = await requireRole("super_admin", "admin");
  const hostingClubIds = await getEventHostingClubIds(id);
  const deleted = await deleteEventEverywhere({
    eventId: id,
    actorUserId: Number(user.id),
  });
  revalidatePath("/management/events");
  revalidatePath("/management/recaps");
  revalidatePath("/management/announcements");
  revalidatePath("/management/approvals");
  revalidatePath("/club-management/events");
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/events/${deleted.slug}`);
  await revalidateClubPages(deleted.clubId, ...hostingClubIds);
}
