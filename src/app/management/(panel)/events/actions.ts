"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { events as eventsT, type EventStatus } from "@/db/schema";
import {
  assertCanEditEvent,
  canPublish,
  requireOps,
  requireRole,
} from "@/lib/rbac";
import { uniqueSlug, slugify } from "@/lib/slug";
import { onEventPublished } from "@/lib/automation/on-publish";
import type { EventCategory } from "@/lib/schemas";

const CATEGORIES: EventCategory[] = [
  "tech",
  "cultural",
  "sports",
  "flagship",
  "academic",
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
  registrationEnabled: boolean;
  priceInPaise: number;
  capacity: number | null;
};

function parse(fd: FormData): ParsedEvent {
  const category = s(fd, "category") as EventCategory;
  const rupees = Number(s(fd, "priceRupees") || 0);
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
    featured: fd.get("featured") === "on",
    clubId: optNum(fd, "clubId"),
    registrationEnabled: fd.get("registrationEnabled") === "on",
    priceInPaise: Number.isFinite(rupees) ? Math.round(rupees * 100) : 0,
    capacity: optNum(fd, "capacity"),
  };
}

/** Resolve the requested status against the user's publishing rights. */
function resolveStatus(requested: string, role: Parameters<typeof canPublish>[0]) {
  const status = (STATUSES.includes(requested as EventStatus)
    ? requested
    : "draft") as EventStatus;
  // Non-publishers cannot publish directly — their "publish" becomes a review request.
  if (status === "published" && !canPublish(role)) return "pending_review";
  return status;
}

export async function createEvent(fd: FormData) {
  const user = await requireOps();
  const data = parse(fd);

  // Club leads can only create events for their own club.
  const clubId = user.role === "club_lead" ? user.clubId : data.clubId;
  assertCanEditEvent(user, clubId);

  const status = resolveStatus(s(fd, "status"), user.role);
  const slug = await uniqueSlug("events", s(fd, "slug") || data.title);

  const [row] = await db
    .insert(eventsT)
    .values({
      ...data,
      clubId,
      slug,
      status,
      organizerId: Number(user.id),
      publishedAt: status === "published" ? new Date().toISOString() : null,
    })
    .returning({ id: eventsT.id });

  if (status === "published") await onEventPublished(row.id);

  revalidatePath("/management/events");
  redirect("/management/events");
}

export async function updateEvent(id: number, fd: FormData) {
  const user = await requireOps();
  const existing = await db.query.events.findFirst({
    where: eq(eventsT.id, id),
  });
  if (!existing) throw new Error("NOT_FOUND");
  assertCanEditEvent(user, existing.clubId);

  const data = parse(fd);
  const clubId = user.role === "club_lead" ? existing.clubId : data.clubId;
  const status = resolveStatus(s(fd, "status"), user.role);

  // Re-slug only if the slug field changed (keep existing otherwise).
  const requestedSlug = s(fd, "slug");
  const slug =
    requestedSlug && slugify(requestedSlug) !== existing.slug
      ? await uniqueSlug("events", requestedSlug, id)
      : existing.slug;

  const justPublished =
    status === "published" && existing.status !== "published";

  await db
    .update(eventsT)
    .set({
      ...data,
      clubId,
      slug,
      status,
      publishedAt:
        justPublished && !existing.publishedAt
          ? new Date().toISOString()
          : existing.publishedAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(eventsT.id, id));

  if (justPublished) await onEventPublished(id);

  revalidatePath("/management/events");
  revalidatePath(`/events/${slug}`);
  redirect("/management/events");
}

/** One-click publish from the approval queue (publishers only). */
export async function publishEvent(id: number) {
  const user = await requireRole(
    "super_admin",
    "admin",
    "council_member",
    "editor",
  );
  const existing = await db.query.events.findFirst({
    where: eq(eventsT.id, id),
  });
  if (!existing) throw new Error("NOT_FOUND");

  await db
    .update(eventsT)
    .set({
      status: "published",
      publishedAt: existing.publishedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(eventsT.id, id));

  await onEventPublished(id);
  revalidatePath("/management/events");
  void user;
}

export async function deleteEvent(id: number) {
  await requireRole("super_admin", "admin");
  await db.delete(eventsT).where(eq(eventsT.id, id));
  revalidatePath("/management/events");
}
