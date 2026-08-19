import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { CalendarDays, Check, Clock3, FilePenLine, Images, Users } from "lucide-react";

import { db } from "@/db/client";
import { contentRevisions, eventFollowupTasks, events } from "@/db/schema";
import { requireStudioClub } from "@/lib/club-studio";
import { ensureEventFollowupTasks } from "@/lib/revisions";
import { requireUser } from "@/lib/rbac";
import { StatusBadge } from "@/components/management/status-badge";
import { withdrawClubRevision } from "./actions";

export default async function ClubStudioHome({
  searchParams,
}: {
  searchParams: Promise<{ club?: string }>;
}) {
  const query = await searchParams;
  const [active, user] = await Promise.all([
    requireStudioClub(query.club),
    requireUser(),
  ]);
  await ensureEventFollowupTasks(active.clubId);

  const [revisions, upcoming, followups, team] = await Promise.all([
    db.query.contentRevisions.findMany({
      where: eq(contentRevisions.clubId, active.clubId),
      orderBy: desc(contentRevisions.createdAt),
      limit: 6,
    }),
    db.query.events.findMany({
      where: and(eq(events.clubId, active.clubId), eq(events.status, "published")),
      orderBy: desc(events.date),
    }),
    db.query.eventFollowupTasks.findMany({
      where: and(
        eq(eventFollowupTasks.clubId, active.clubId),
        eq(eventFollowupTasks.status, "open"),
      ),
      with: { event: true },
    }),
    db.query.clubMemberships.findMany({
      where: (membership, { and: all, eq: same }) =>
        all(same(membership.clubId, active.clubId), same(membership.isActive, true)),
    }),
  ]);

  const pending = revisions.filter((item) => item.status === "pending_review");
  const changes = revisions.filter((item) => item.status === "changes_requested");
  const clubQuery = `?club=${active.clubId}`;
  const tasks = [
    ...(changes.length
      ? [{
          title: `${changes.length} revision${changes.length === 1 ? " needs" : "s need"} changes`,
          body: "Open the draft, respond to the review note, and submit again.",
          href: `/club-management/page-editor${clubQuery}`,
          action: "Open revisions",
        }]
      : []),
    ...(followups.length
      ? [{
          title: `Add media for ${followups[0].event.title}`,
          body: "One approved photo or video link completes the post-event task.",
          href: `/club-management/follow-up${clubQuery}`,
          action: "Add follow-up",
        }]
      : []),
    ...(!active.canEditPage
      ? []
      : revisions.length === 0
        ? [{
            title: "Choose your public page",
            body: "Start with Stage, Zine, or Clubhouse. Your current page stays public during review.",
            href: `/club-management/page-editor${clubQuery}`,
            action: "Open page editor",
          }]
        : []),
  ];

  return (
    <div className="space-y-10">
      <header className="max-w-3xl">
        <p className="text-sm font-medium text-subtle">{active.clubName}</p>
        <h1 className="mt-2 text-balance font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          What needs attention
        </h1>
        <p className="mt-3 max-w-[65ch] text-base leading-7 text-muted">
          Draft privately, send complete changes for review, and keep the approved page live until the next version is ready.
        </p>
      </header>

      {tasks.length > 0 ? (
        <section className="space-y-3" aria-labelledby="tasks-heading">
          <h2 id="tasks-heading" className="text-lg font-semibold">Tasks</h2>
          {tasks.map((task) => (
            <article
              key={task.title}
              className="grid gap-5 rounded-2xl bg-surface p-5 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <h3 className="font-medium">{task.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{task.body}</p>
              </div>
              <Link
                href={task.href}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-ink px-4 text-sm font-medium text-bg transition-transform active:scale-[0.98]"
              >
                {task.action}
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="flex items-start gap-4 rounded-2xl bg-surface p-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
            <Check className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-medium">You are caught up</h2>
            <p className="mt-1 text-sm text-muted">No reviews or post-event media are waiting.</p>
          </div>
        </section>
      )}

      <section className="grid gap-px overflow-hidden rounded-2xl bg-line/10 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Clock3} label="Awaiting review" value={pending.length} />
        <Metric icon={CalendarDays} label="Published events" value={upcoming.length} />
        <Metric icon={Users} label="Active team" value={team.length} />
        <Metric icon={Images} label="Follow-ups" value={followups.length} />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Recent work</h2>
          {active.canEditPage ? (
            <Link className="text-sm text-muted hover:text-ink" href={`/club-management/page-editor${clubQuery}`}>
              Edit page
            </Link>
          ) : null}
        </div>
        {revisions.length ? (
          <div className="overflow-hidden rounded-2xl bg-surface">
            {revisions.map((revision) => (
              <div key={revision.id} className="flex items-center gap-4 border-b border-line/10 px-5 py-4 last:border-0">
                <FilePenLine className="h-4 w-4 text-subtle" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium capitalize">{revision.entityType.replace("_", " ")}</p>
                  <p className="mt-0.5 text-xs text-subtle">Version based on {revision.baseVersion}</p>
                </div>
                <StatusBadge status={revision.status} />
                {revision.status === "pending_review" && revision.authorUserId === Number(user.id) ? (
                  <form action={withdrawClubRevision}>
                    <input type="hidden" name="revisionId" value={revision.id} />
                    <button
                      type="submit"
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-line/5 hover:text-ink"
                    >
                      Withdraw
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-surface px-5 py-8 text-sm text-muted">No drafts or submissions yet.</p>
        )}
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: number }) {
  return (
    <div className="bg-surface p-5">
      <Icon className="h-4 w-4 text-subtle" />
      <p className="mt-5 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}
