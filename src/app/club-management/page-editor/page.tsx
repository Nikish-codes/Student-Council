import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import { clubs, contentRevisions, media } from "@/db/schema";
import { getClub, getClubEvents, getClubLeads } from "@/lib/content";
import { requireStudioClub } from "@/lib/club-studio";
import { requireUser } from "@/lib/rbac";
import { clubPageSnapshotSchema, type ClubPageSnapshot } from "@/lib/revisions";
import { ClubPageEditor } from "./club-page-editor";

export default async function ClubPageEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string; revision?: string; saved?: string }>;
}) {
  const query = await searchParams;
  const [active, user] = await Promise.all([
    requireStudioClub(query.club),
    requireUser(),
  ]);
  if (!active.canEditPage && active.membershipRole !== "president") {
    throw new Error("FORBIDDEN");
  }
  const [club, clubRow, clubEvents, leads] = await Promise.all([
    getClub(active.clubSlug),
    db.query.clubs.findFirst({ where: eq(clubs.id, active.clubId) }),
    getClubEvents(active.clubId),
    getClubLeads(active.clubId),
  ]);
  if (!club || !clubRow) notFound();

  const requested = query.revision
    ? await db.query.contentRevisions.findFirst({
        where: and(
          eq(contentRevisions.id, query.revision),
          eq(contentRevisions.clubId, active.clubId),
          eq(contentRevisions.entityType, "club_page"),
        ),
      })
    : await db.query.contentRevisions.findFirst({
        where: and(
          eq(contentRevisions.clubId, active.clubId),
          eq(contentRevisions.entityType, "club_page"),
          eq(contentRevisions.authorUserId, Number(user.id)),
          eq(contentRevisions.status, "draft"),
        ),
        orderBy: desc(contentRevisions.createdAt),
      });

  const approved: ClubPageSnapshot = {
    name: club.name,
    blurb: club.blurb,
    tagline: club.tagline ?? null,
    about: club.about ?? null,
    logoId: clubRow.logoId,
    coverId: clubRow.coverId,
    joinUrl: club.joinUrl ?? null,
    members: club.members ?? null,
    foundedYear: club.foundedYear ?? null,
    flagshipEvent: club.flagshipEvent ?? null,
    activities: club.activities,
    videos: club.videos,
    gallery: club.gallery,
    instagramUrl: club.instagramUrl ?? null,
    linkedinUrl: club.linkedinUrl ?? null,
    websiteUrl: club.websiteUrl ?? null,
    contactEmail: club.contactEmail ?? null,
    pageTemplate: "stage",
    pageTheme: {
      background: "#0b0705",
      foreground: "#fff5e9",
      accent: club.pageTheme?.accent ?? "#ff5a1f",
      logoTreatment: "natural",
    },
    pageVisibleSections: club.pageVisibleSections ?? [
      "about",
      "activities",
      "videos",
      "events",
      "gallery",
      "people",
    ],
    pageSectionHeadings: club.pageSectionHeadings ?? {},
    pageTypography: "friendly",
  };
  const parsed = requested
    ? clubPageSnapshotSchema.safeParse(requested.snapshot)
    : null;
  const initial = parsed?.success ? parsed.data : approved;
  const mediaRows = await db
    .select({ id: media.id, url: media.url, filename: media.filename })
    .from(media)
    .orderBy(desc(media.createdAt));

  return (
    <ClubPageEditor
      club={club}
      initial={initial}
      media={mediaRows}
      revision={
        requested
          ? {
              id: requested.id,
              status: requested.status,
              note: requested.reviewNote,
              baseVersion: requested.baseVersion,
            }
          : null
      }
      baseVersion={clubRow.version}
      saved={query.saved === "1"}
      upcoming={clubEvents.upcoming}
      past={clubEvents.past}
      leads={leads}
    />
  );
}
