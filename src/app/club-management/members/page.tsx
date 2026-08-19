import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { clubs, contentRevisions, media } from "@/db/schema";
import { requireStudioClub } from "@/lib/club-studio";
import { buildApprovedClubPageSnapshot } from "@/lib/club-page-snapshot";
import { requireUser } from "@/lib/rbac";
import { clubPageSnapshotSchema } from "@/lib/revisions";
import { MembersEditor } from "./members-editor";

export default async function ClubMembersPage({
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

  const [club, approved, revision, mediaRows] = await Promise.all([
    db.query.clubs.findFirst({
      where: eq(clubs.id, active.clubId),
      columns: { version: true },
    }),
    buildApprovedClubPageSnapshot(active.clubId),
    query.revision
      ? db.query.contentRevisions.findFirst({
          where: and(
            eq(contentRevisions.id, query.revision),
            eq(contentRevisions.clubId, active.clubId),
            eq(contentRevisions.entityType, "club_page"),
            eq(contentRevisions.authorUserId, Number(user.id)),
          ),
        })
      : db.query.contentRevisions.findFirst({
          where: and(
            eq(contentRevisions.clubId, active.clubId),
            eq(contentRevisions.entityType, "club_page"),
            eq(contentRevisions.authorUserId, Number(user.id)),
            eq(contentRevisions.status, "draft"),
          ),
          orderBy: desc(contentRevisions.createdAt),
        }),
    db
      .select({ id: media.id, url: media.url, filename: media.filename })
      .from(media)
      .orderBy(desc(media.createdAt)),
  ]);
  if (!club) throw new Error("NOT_FOUND");

  const parsed = revision
    ? clubPageSnapshotSchema.safeParse(revision.snapshot)
    : null;
  const initialPeople = parsed?.success
    ? (parsed.data.people ?? approved.people ?? [])
    : (approved.people ?? []);

  return (
    <MembersEditor
      clubId={active.clubId}
      revisionId={revision?.status === "draft" ? revision.id : undefined}
      baseVersion={club.version}
      initialPeople={initialPeople}
      media={mediaRows}
      saved={query.saved === "1"}
    />
  );
}
