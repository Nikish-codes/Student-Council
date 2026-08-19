import "server-only";

import { and, desc, eq, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import {
  auditLog,
  clubs,
  contentRevisions,
  eventFollowupTasks,
  events,
  media,
  recaps,
  type RevisionEntityType,
} from "@/db/schema";
import { onEventPublished } from "@/lib/automation/on-publish";
import { requireClubMembership } from "@/lib/club-access";
import { CLUB_GALLERY_UPLOAD_MAX_BYTES } from "@/lib/media-upload-policy";
import { requireReviewer, requireUser } from "@/lib/rbac";
import {
  assertRevisionTransition,
  hasApprovedFollowupMedia,
  isRevisionStale,
} from "@/lib/revision-domain";
import { newId } from "@/lib/tickets";
import { uniqueSlug } from "@/lib/slug";
import { revalidateClubPages } from "@/lib/revalidate-club";
import { hasAccessibleClubTheme } from "@/lib/club-page-theme";

const optionalUrl = z.union([z.literal(""), z.string().url()]).nullable().optional();
const galleryItem = z.object({
  url: z.string().url(),
  caption: z.string().max(160).optional(),
  size: z.enum(["small", "medium", "large"]).optional(),
  mediaId: z.number().int().positive().optional(),
});

export const clubPageSnapshotSchema = z.object({
  name: z.string().min(2).max(120),
  blurb: z.string().min(10).max(600),
  tagline: z.string().max(180).nullable().optional(),
  about: z.string().max(8000).nullable().optional(),
  logoId: z.number().int().positive().nullable().optional(),
  coverId: z.number().int().positive().nullable().optional(),
  joinUrl: optionalUrl,
  members: z.number().int().nonnegative().nullable().optional(),
  foundedYear: z.number().int().min(1900).max(2200).nullable().optional(),
  flagshipEvent: z.string().max(160).nullable().optional(),
  activities: z
    .array(z.object({ title: z.string().min(1), description: z.string().optional() }))
    .max(20),
  videos: z
    .array(z.object({ url: z.string().url(), title: z.string().optional() }))
    .max(12),
  gallery: z.array(galleryItem).max(40),
  instagramUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  websiteUrl: optionalUrl,
  contactEmail: z.union([z.literal(""), z.string().email()]).nullable().optional(),
  pageTemplate: z.enum(["stage", "zine", "clubhouse"]),
  pageTheme: z.object({
    background: z.string().regex(/^#[0-9a-f]{6}$/i),
    foreground: z.string().regex(/^#[0-9a-f]{6}$/i),
    accent: z.string().regex(/^#[0-9a-f]{6}$/i),
    logoTreatment: z.enum(["natural", "badge", "monochrome"]),
  }).refine(hasAccessibleClubTheme, {
    message: "Page text and accent colors must remain readable against the background.",
  }),
  pageVisibleSections: z
    .array(z.enum(["about", "activities", "videos", "events", "gallery", "people"]))
    .min(1),
  pageSectionHeadings: z.record(z.string(), z.string().max(80)),
  pageTypography: z.enum(["signal", "editorial", "friendly"]),
});

export const eventSnapshotSchema = z.object({
  title: z.string().min(2).max(160),
  slug: z.string().min(2).max(180),
  category: z.enum(["tech", "cultural", "sports", "flagship", "academic", "community"]),
  date: z.string().min(1),
  endDate: z.string().nullable().optional(),
  venue: z.string().min(2).max(240),
  excerpt: z.string().min(5).max(240),
  description: z.string().max(20000),
  bannerId: z.number().int().positive().nullable().optional(),
  videoUrl: optionalUrl,
  registrationUrl: optionalUrl,
  attendees: z.number().int().nonnegative().nullable().optional(),
  featured: z.boolean(),
  clubId: z.number().int().positive(),
  registrationEnabled: z.boolean(),
  priceInPaise: z.number().int().nonnegative(),
  capacity: z.number().int().positive().nullable().optional(),
});

export const followupSnapshotSchema = z.object({
  title: z.string().min(2).max(160),
  kicker: z.string().max(120).nullable().optional(),
  blurb: z.string().max(4000).nullable().optional(),
  heroMediaId: z.number().int().positive().nullable().optional(),
  photoMediaIds: z.array(z.number().int().positive()).max(40),
  videoLinks: z.array(z.string().url()).max(12),
});

export type ClubPageSnapshot = z.infer<typeof clubPageSnapshotSchema>;
export type EventSnapshot = z.infer<typeof eventSnapshotSchema>;
export type FollowupSnapshot = z.infer<typeof followupSnapshotSchema>;

export function validateRevisionSnapshot(
  type: RevisionEntityType,
  snapshot: Record<string, unknown>,
) {
  if (type === "club_page") return clubPageSnapshotSchema.parse(snapshot);
  if (type === "event") return eventSnapshotSchema.parse(snapshot);
  return followupSnapshotSchema.parse(snapshot);
}

function permissionFor(type: RevisionEntityType) {
  if (type === "club_page") return "edit_page" as const;
  if (type === "event") return "manage_events" as const;
  return "manage_media" as const;
}

async function assertRevisionEntityOwnership(
  entityType: RevisionEntityType,
  entityId: number,
  clubId: number,
) {
  if (entityType === "club_page") {
    const club = await db.query.clubs.findFirst({
      where: and(eq(clubs.id, entityId), eq(clubs.id, clubId)),
      columns: { id: true },
    });
    if (!club) throw new Error("ENTITY_CLUB_MISMATCH");
    return;
  }
  if (entityType === "event") {
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, entityId), eq(events.clubId, clubId)),
      columns: { id: true },
    });
    if (!event) throw new Error("ENTITY_CLUB_MISMATCH");
    return;
  }
  const recap = await db.query.recaps.findFirst({
    where: eq(recaps.id, entityId),
    columns: { eventId: true },
  });
  const event = recap?.eventId
    ? await db.query.events.findFirst({
        where: and(eq(events.id, recap.eventId), eq(events.clubId, clubId)),
        columns: { id: true },
      })
    : null;
  if (!event) throw new Error("ENTITY_CLUB_MISMATCH");
}

async function authorizeRevisionAuthor(
  clubId: number,
  entityType: RevisionEntityType,
) {
  const user = await requireUser();
  if (
    ["super_admin", "operations", "admin", "council_member", "editor"].includes(
      user.role,
    )
  ) {
    return user;
  }
  return (await requireClubMembership(clubId, permissionFor(entityType))).user;
}

export async function saveRevisionDraft(input: {
  revisionId?: string;
  entityType: RevisionEntityType;
  entityId: number;
  clubId: number;
  baseVersion: number;
  snapshot: Record<string, unknown>;
}) {
  await assertRevisionEntityOwnership(
    input.entityType,
    input.entityId,
    input.clubId,
  );
  const user = await authorizeRevisionAuthor(input.clubId, input.entityType);
  const snapshot = validateRevisionSnapshot(input.entityType, input.snapshot);
  const now = new Date().toISOString();

  if (input.revisionId) {
    const existing = await db.query.contentRevisions.findFirst({
      where: and(
        eq(contentRevisions.id, input.revisionId),
        eq(contentRevisions.clubId, input.clubId),
        eq(contentRevisions.authorUserId, Number(user.id)),
      ),
    });
    if (!existing) throw new Error("NOT_FOUND");
    assertRevisionTransition(existing.status, "save");
    await db
      .update(contentRevisions)
      .set({ snapshot, updatedAt: now })
      .where(eq(contentRevisions.id, existing.id));
    return existing.id;
  }

  const id = newId();
  await db.transaction(async (tx) => {
    await tx.insert(contentRevisions).values({
      id,
      entityType: input.entityType,
      entityId: input.entityId,
      clubId: input.clubId,
      status: "draft",
      snapshot,
      baseVersion: input.baseVersion,
      authorUserId: Number(user.id),
    });
    await tx.insert(auditLog).values({
      id: newId(),
      actorUserId: Number(user.id),
      clubId: input.clubId,
      eventId: input.entityType === "event" ? input.entityId : null,
      revisionId: id,
      action: `${input.entityType}.draft_created`,
      targetId: String(input.entityId),
    });
  });
  return id;
}

export async function submitRevision(revisionId: string) {
  const user = await requireUser();
  const revision = await db.query.contentRevisions.findFirst({
    where: eq(contentRevisions.id, revisionId),
  });
  if (!revision || revision.authorUserId !== Number(user.id)) {
    throw new Error("NOT_FOUND");
  }
  await assertRevisionEntityOwnership(
    revision.entityType,
    revision.entityId,
    revision.clubId,
  );
  await authorizeRevisionAuthor(revision.clubId, revision.entityType);
  assertRevisionTransition(revision.status, "submit");
  validateRevisionSnapshot(revision.entityType, revision.snapshot);
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx
      .update(contentRevisions)
      .set({ status: "pending_review", submittedAt: now, updatedAt: now })
      .where(eq(contentRevisions.id, revision.id));
    await tx.insert(auditLog).values({
      id: newId(),
      actorUserId: Number(user.id),
      clubId: revision.clubId,
      eventId: revision.entityType === "event" ? revision.entityId : null,
      revisionId: revision.id,
      action: `${revision.entityType}.submitted`,
      targetId: String(revision.entityId),
    });
  });
  void notifySubmission(revision.id, revision.entityType, revision.clubId);
}

export async function reviewRevision(input: {
  revisionId: string;
  action: "approve" | "request_changes" | "decline";
  note?: string;
}) {
  const reviewer = await requireReviewer();
  const revision = await db.query.contentRevisions.findFirst({
    where: eq(contentRevisions.id, input.revisionId),
  });
  if (!revision) throw new Error("NOT_FOUND");
  await assertRevisionEntityOwnership(
    revision.entityType,
    revision.entityId,
    revision.clubId,
  );
  assertRevisionTransition(revision.status, input.action);
  const note = input.note?.trim() ?? "";
  if (input.action !== "approve" && !note) throw new Error("REVIEW_NOTE_REQUIRED");

  if (input.action === "approve") {
    await approveRevisionSnapshot(revision, Number(reviewer.id), note || null);
    if (revision.entityType === "event") await onEventPublished(revision.entityId);
    await revalidateClubPages(revision.clubId);
    return;
  }

  const status = input.action === "decline" ? "declined" : "changes_requested";
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx
      .update(contentRevisions)
      .set({
        status,
        reviewedByUserId: Number(reviewer.id),
        reviewedAt: now,
        reviewNote: note,
        updatedAt: now,
      })
      .where(eq(contentRevisions.id, revision.id));
    if (input.action === "request_changes") {
      await tx.insert(contentRevisions).values({
        id: newId(),
        entityType: revision.entityType,
        entityId: revision.entityId,
        clubId: revision.clubId,
        status: "draft",
        snapshot: revision.snapshot,
        baseVersion: revision.baseVersion,
        authorUserId: revision.authorUserId,
        supersedesRevisionId: revision.id,
      });
    }
    await tx.insert(auditLog).values({
      id: newId(),
      actorUserId: Number(reviewer.id),
      clubId: revision.clubId,
      eventId: revision.entityType === "event" ? revision.entityId : null,
      revisionId: revision.id,
      action: `${revision.entityType}.${status}`,
      targetId: String(revision.entityId),
      meta: { note },
    });
  });
}

async function approveRevisionSnapshot(
  revision: typeof contentRevisions.$inferSelect,
  reviewerId: number,
  note: string | null,
) {
  const now = new Date().toISOString();
  const parsed = validateRevisionSnapshot(revision.entityType, revision.snapshot);
  await db.transaction(async (tx) => {
    if (revision.entityType === "club_page") {
      const current = await tx.query.clubs.findFirst({
        where: eq(clubs.id, revision.entityId),
      });
      if (!current || isRevisionStale(revision.baseVersion, current.version)) {
        throw new Error("STALE_REVISION");
      }
      const snapshot = parsed as ClubPageSnapshot;
      await tx
        .update(clubs)
        .set({ ...snapshot, version: current.version + 1, updatedAt: now })
        .where(eq(clubs.id, current.id));
    } else if (revision.entityType === "event") {
      const current = await tx.query.events.findFirst({
        where: eq(events.id, revision.entityId),
      });
      if (!current || isRevisionStale(revision.baseVersion, current.version)) {
        throw new Error("STALE_REVISION");
      }
      const snapshot = parsed as EventSnapshot;
      await tx
        .update(events)
        .set({
          ...snapshot,
          status: "published",
          version: current.version + 1,
          publishedAt: current.publishedAt ?? now,
          updatedAt: now,
        })
        .where(eq(events.id, current.id));
    } else {
      const current = await tx.query.recaps.findFirst({
        where: eq(recaps.id, revision.entityId),
      });
      if (!current || isRevisionStale(revision.baseVersion, current.version)) {
        throw new Error("STALE_REVISION");
      }
      const snapshot = parsed as FollowupSnapshot;
      const mediaRows = snapshot.photoMediaIds.length
        ? await tx
            .select({
              id: media.id,
              url: media.url,
              filesize: media.filesize,
              mimeType: media.mimeType,
            })
            .from(media)
            .where(inArray(media.id, snapshot.photoMediaIds))
        : [];
      if (
        mediaRows.length !== snapshot.photoMediaIds.length ||
        mediaRows.some(
          (item) =>
            !item.mimeType?.startsWith("image/") ||
            !item.filesize ||
            item.filesize > CLUB_GALLERY_UPLOAD_MAX_BYTES,
        )
      ) {
        throw new Error("INVALID_FOLLOWUP_MEDIA");
      }
      await tx
        .update(recaps)
        .set({
          title: snapshot.title,
          kicker: snapshot.kicker || null,
          blurb: snapshot.blurb || null,
          heroMediaId: snapshot.heroMediaId || mediaRows[0]?.id || null,
          heroVideoUrl: snapshot.videoLinks[0] || null,
          gallery: mediaRows.map((item) => ({ url: item.url })),
          status: "published",
          publishedAt: current.publishedAt ?? now,
          version: current.version + 1,
          updatedAt: now,
        })
        .where(eq(recaps.id, current.id));
      if (hasApprovedFollowupMedia(snapshot)) {
        await tx
          .update(eventFollowupTasks)
          .set({ status: "completed", completedAt: now, updatedAt: now })
          .where(eq(eventFollowupTasks.eventId, current.eventId ?? -1));
      }
    }

    await tx
      .update(contentRevisions)
      .set({
        status: "approved",
        reviewedByUserId: reviewerId,
        reviewedAt: now,
        reviewNote: note,
        updatedAt: now,
      })
      .where(eq(contentRevisions.id, revision.id));
    await tx.insert(auditLog).values({
      id: newId(),
      actorUserId: reviewerId,
      clubId: revision.clubId,
      eventId: revision.entityType === "event" ? revision.entityId : null,
      revisionId: revision.id,
      action: `${revision.entityType}.approved`,
      targetId: String(revision.entityId),
    });
  });
}

export async function withdrawRevision(revisionId: string) {
  const user = await requireUser();
  const revision = await db.query.contentRevisions.findFirst({
    where: and(
      eq(contentRevisions.id, revisionId),
      eq(contentRevisions.authorUserId, Number(user.id)),
    ),
  });
  if (!revision) throw new Error("NOT_FOUND");
  assertRevisionTransition(revision.status, "withdraw");
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx
      .update(contentRevisions)
      .set({ status: "withdrawn", updatedAt: now })
      .where(eq(contentRevisions.id, revision.id));
    await tx.insert(auditLog).values({
      id: newId(),
      actorUserId: Number(user.id),
      clubId: revision.clubId,
      eventId: revision.entityType === "event" ? revision.entityId : null,
      revisionId: revision.id,
      action: `${revision.entityType}.withdrawn`,
      targetId: String(revision.entityId),
    });
  });
}

export async function ensureEventFollowupTasks(clubId?: number) {
  const now = new Date().toISOString();
  const ended = await db.query.events.findMany({
    where: and(
      eq(events.status, "published"),
      isNotNull(events.clubId),
      or(
        lte(events.endDate, now),
        and(isNull(events.endDate), lte(events.date, now)),
      ),
      clubId ? eq(events.clubId, clubId) : undefined,
    ),
  });
  for (const event of ended) {
    if (!event.clubId) continue;
    const existing = await db.query.eventFollowupTasks.findFirst({
      where: eq(eventFollowupTasks.eventId, event.id),
    });
    if (!existing) {
      await db.insert(eventFollowupTasks).values({
        id: newId(),
        eventId: event.id,
        clubId: event.clubId,
      });
    }
    const recap = await db.query.recaps.findFirst({
      where: eq(recaps.eventId, event.id),
    });
    if (!recap) {
      await db.insert(recaps).values({
        title: `${event.title} — Recap`,
        slug: await uniqueSlug("recaps", `${event.slug}-recap`),
        eventId: event.id,
        kicker: event.category.toUpperCase(),
        status: "draft",
        gallery: [],
        stats: [],
      });
    }
  }
}

export async function latestRevision(
  entityType: RevisionEntityType,
  entityId: number,
) {
  return db.query.contentRevisions.findFirst({
    where: and(
      eq(contentRevisions.entityType, entityType),
      eq(contentRevisions.entityId, entityId),
    ),
    orderBy: desc(contentRevisions.createdAt),
  });
}

async function notifySubmission(
  revisionId: string,
  entityType: RevisionEntityType,
  clubId: number,
) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: `Approval requested: ${entityType} for club ${clubId}\nRevision ${revisionId}`,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("[approvals] Discord notification failed", error);
  }
}
