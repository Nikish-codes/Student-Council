import { and, asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { EventEditor } from "@/app/management/(panel)/events/event-editor";
import { db } from "@/db/client";
import { contentRevisions, events, media } from "@/db/schema";
import { StatusBadge } from "@/components/management/status-badge";
import { requireStudioClub } from "@/lib/club-studio";
import { requireUser } from "@/lib/rbac";
import { eventSnapshotSchema } from "@/lib/revisions";
import { withdrawClubRevision } from "@/app/club-management/actions";
import { createClubEvent, updateClubEvent } from "../actions";

export default async function ClubEventEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ club?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [active, user] = await Promise.all([
    requireStudioClub(query.club),
    requireUser(),
  ]);
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
  const history = event
    ? await db.query.contentRevisions.findMany({
        where: and(
          eq(contentRevisions.entityType, "event"),
          eq(contentRevisions.entityId, event.id),
          eq(contentRevisions.clubId, active.clubId),
        ),
        orderBy: desc(contentRevisions.createdAt),
        with: { author: true, reviewer: true },
      })
    : [];
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
      {!isNew ? (
        <section className="mt-8 rounded-2xl bg-surface p-5 sm:p-6" aria-labelledby="event-history-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="event-history-heading" className="text-lg font-semibold">Edit history</h2>
              <p className="mt-1 text-sm text-muted">Every saved submission remains visible, including review decisions.</p>
            </div>
            <span className="text-xs text-subtle">Public version {event?.version ?? 0}</span>
          </div>
          {history.length ? (
            <ol className="mt-5 divide-y divide-line/10 border-y border-line/10">
              {history.map((revision) => (
                <li key={revision.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={revision.status} />
                      <span className="text-xs text-subtle">Based on version {revision.baseVersion}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {revision.author.name} · {new Date(revision.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      {revision.reviewer ? ` · reviewed by ${revision.reviewer.name}` : ""}
                    </p>
                    {revision.reviewNote ? <p className="mt-2 text-sm text-red-300">{revision.reviewNote}</p> : null}
                  </div>
                  {revision.status === "pending_review" && revision.authorUserId === Number(user.id) ? (
                    <form action={withdrawClubRevision}>
                      <input type="hidden" name="revisionId" value={revision.id} />
                      <button type="submit" className="min-h-9 rounded-lg border border-line/15 px-3 text-xs font-medium hover:bg-line/5">Withdraw submission</button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-5 border-y border-line/10 py-5 text-sm text-muted">No revisions have been saved for this event.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
