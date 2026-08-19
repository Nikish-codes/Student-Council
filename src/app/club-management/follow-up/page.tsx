import { and, desc, eq } from "drizzle-orm";
import { Images } from "lucide-react";

import { MediaField } from "@/components/management/fields";
import { db } from "@/db/client";
import { contentRevisions, eventFollowupTasks, media, recaps } from "@/db/schema";
import { requireStudioClub } from "@/lib/club-studio";
import { ensureEventFollowupTasks } from "@/lib/revisions";
import { saveFollowupRevision } from "./actions";

const input = "mt-2 w-full rounded-xl border border-line/15 bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-line/40";

export default async function ClubFollowupPage({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  const query = await searchParams;
  const active = await requireStudioClub(query.club);
  if (!active.canManageMedia && active.membershipRole !== "president") throw new Error("FORBIDDEN");
  await ensureEventFollowupTasks(active.clubId);
  const [tasks, mediaRows] = await Promise.all([
    db.query.eventFollowupTasks.findMany({
      where: eq(eventFollowupTasks.clubId, active.clubId),
      orderBy: desc(eventFollowupTasks.createdAt),
      with: { event: true },
    }),
    db.select({ id: media.id, url: media.url, filename: media.filename }).from(media).orderBy(desc(media.createdAt)),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-subtle">After the event</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-[-0.03em]">Follow-up</h1>
        <p className="mt-2 max-w-[65ch] text-sm leading-6 text-muted">Add at least one photo or video link. Media appears publicly only after approval.</p>
      </header>
      {tasks.length ? (
        <div className="space-y-5">
          {await Promise.all(tasks.map(async (task) => {
            const recap = await db.query.recaps.findFirst({ where: eq(recaps.eventId, task.eventId) });
            if (!recap) return null;
            const draft = await db.query.contentRevisions.findFirst({
              where: and(
                eq(contentRevisions.entityType, "event_followup"),
                eq(contentRevisions.entityId, recap.id),
                eq(contentRevisions.status, "draft"),
              ),
              orderBy: desc(contentRevisions.createdAt),
            });
            const snapshot = (draft?.snapshot ?? {}) as Record<string, unknown>;
            return (
              <article key={task.id} className="rounded-2xl bg-surface p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><h2 className="text-lg font-semibold">{task.event.title}</h2><p className="mt-1 text-sm text-muted">{new Date(task.event.date).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${task.status === "completed" ? "bg-emerald-500/12 text-emerald-400" : "bg-amber-500/12 text-amber-300"}`}>{task.status}</span>
                </div>
                {task.status === "open" ? (
                  <form action={saveFollowupRevision} className="mt-6 grid gap-5 sm:grid-cols-2">
                    <input type="hidden" name="clubId" value={active.clubId} />
                    <input type="hidden" name="eventId" value={task.eventId} />
                    <input type="hidden" name="revisionId" value={draft?.id ?? ""} />
                    <label className="text-sm font-medium text-muted">Recap title<input className={input} name="title" required defaultValue={String(snapshot.title ?? recap.title)} /></label>
                    <label className="text-sm font-medium text-muted">Short label<input className={input} name="kicker" defaultValue={String(snapshot.kicker ?? recap.kicker ?? "")} /></label>
                    <label className="text-sm font-medium text-muted sm:col-span-2">What happened<textarea className={input} name="blurb" rows={4} defaultValue={String(snapshot.blurb ?? recap.blurb ?? "")} /></label>
                    <MediaField name="heroMediaId" label="Highlight photo" hint="4 MB maximum" defaultValue={typeof snapshot.heroMediaId === "number" ? snapshot.heroMediaId : recap.heroMediaId} media={mediaRows} />
                    <label className="text-sm font-medium text-muted">Video links<span className="ml-2 text-xs font-normal text-subtle">One URL per line</span><textarea className={input} name="videoLinks" rows={4} defaultValue={Array.isArray(snapshot.videoLinks) ? snapshot.videoLinks.join("\n") : recap.heroVideoUrl ?? ""} /></label>
                    <div className="flex justify-end gap-2 sm:col-span-2">
                      <button type="submit" name="intent" value="save" className="min-h-10 rounded-xl border border-line/15 px-4 text-sm font-medium hover:bg-line/5">Save draft</button>
                      <button type="submit" name="intent" value="submit" className="min-h-10 rounded-xl bg-ink px-4 text-sm font-medium text-bg">Submit for review</button>
                    </div>
                  </form>
                ) : null}
              </article>
            );
          }))}
        </div>
      ) : (
        <div className="grid min-h-56 place-items-center rounded-2xl bg-surface text-center"><div><Images className="mx-auto h-6 w-6 text-subtle" /><h2 className="mt-4 font-medium">No follow-up tasks</h2><p className="mt-1 text-sm text-muted">Tasks appear after a published event ends.</p></div></div>
      )}
    </div>
  );
}
