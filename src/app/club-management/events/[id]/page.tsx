import { and, asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { EventEditor } from "@/app/management/(panel)/events/event-editor";
import { db } from "@/db/client";
import { contentRevisions, events, media } from "@/db/schema";
import { requireStudioClub } from "@/lib/club-studio";
import { eventSnapshotSchema } from "@/lib/revisions";
import { createClubEvent, updateClubEvent } from "../actions";

export default async function ClubEventEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ club?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const active = await requireStudioClub(query.club);
  if (!active.canManageEvents && active.membershipRole !== "president") throw new Error("FORBIDDEN");
  const isNew = id === "new";
  const event = isNew ? null : await db.query.events.findFirst({ where: eq(events.id, Number(id)) });
  if (!isNew && (!event || event.clubId !== active.clubId)) notFound();

  const draft = event
    ? await db.query.contentRevisions.findFirst({
        where: and(
          eq(contentRevisions.entityType, "event"),
          eq(contentRevisions.entityId, event.id),
          eq(contentRevisions.status, "draft"),
        ),
        orderBy: desc(contentRevisions.createdAt),
      })
    : null;
  const parsed = draft ? eventSnapshotSchema.safeParse(draft.snapshot) : null;
  const editableEvent = event && parsed?.success
    ? { ...event, ...parsed.data, status: "draft" as const }
    : event;
  const mediaRows = await db
    .select({ id: media.id, filename: media.filename, url: media.url })
    .from(media)
    .orderBy(asc(media.filename));
  const action = isNew
    ? createClubEvent
    : updateClubEvent.bind(null, Number(id));

  return (
    <div>
      {draft ? <input type="hidden" name="revisionId" value={draft.id} /> : null}
      <EventEditor
        action={async (formData) => {
          "use server";
          if (draft) formData.set("revisionId", draft.id);
          await action(formData);
        }}
        event={editableEvent ?? null}
        clubs={[{ id: active.clubId, name: active.clubName }]}
        media={mediaRows}
        canPublish={false}
        isClubLead
        basePath={`/club-management/events?club=${active.clubId}`}
        lockedClubId={active.clubId}
      />
    </div>
  );
}
