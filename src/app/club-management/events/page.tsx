import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { CalendarDays, Plus } from "lucide-react";

import { db } from "@/db/client";
import { contentRevisions, events } from "@/db/schema";
import { StatusBadge } from "@/components/management/status-badge";
import { requireStudioClub } from "@/lib/club-studio";
import { isEventPast } from "@/lib/event-status";
import { hostedByClubWhere } from "@/lib/event-hosts";

export default async function ClubEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string; view?: string }>;
}) {
  const query = await searchParams;
  const active = await requireStudioClub(query.club);
  if (!active.canManageEvents && active.membershipRole !== "president")
    throw new Error("FORBIDDEN");
  const rows = await db.query.events.findMany({
    where: hostedByClubWhere(active.clubId),
    orderBy: desc(events.date),
  });
  const revisions = rows.length
    ? await db.query.contentRevisions.findMany({
        where: and(
          eq(contentRevisions.entityType, "event"),
          eq(contentRevisions.clubId, active.clubId),
          inArray(
            contentRevisions.entityId,
            rows.map((row) => row.id),
          ),
        ),
        orderBy: desc(contentRevisions.createdAt),
      })
    : [];
  const latest = new Map<number, (typeof revisions)[number]>();
  revisions.forEach((revision) => {
    if (revision.entityType === "event" && !latest.has(revision.entityId))
      latest.set(revision.entityId, revision);
  });
  const now = Date.now();
  const groups = {
    drafts: rows.filter(
      (row) =>
        latest.get(row.id)?.status === "draft" ||
        (!latest.get(row.id) && row.status === "draft"),
    ),
    review: rows.filter(
      (row) => latest.get(row.id)?.status === "pending_review",
    ),
    changes: rows.filter(
      (row) => latest.get(row.id)?.status === "changes_requested",
    ),
    upcoming: rows.filter(
      (row) =>
        row.status === "published" &&
        !isEventPast(
          { date: row.date, endDate: row.endDate ?? undefined },
          now,
        ),
    ),
    past: rows.filter(
      (row) =>
        row.status === "published" &&
        isEventPast({ date: row.date, endDate: row.endDate ?? undefined }, now),
    ),
  };
  const view = (
    query.view && query.view in groups ? query.view : "drafts"
  ) as keyof typeof groups;
  const selected = groups[view];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-subtle">Plan and publish</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-[-0.03em]">
            Events
          </h1>
          <p className="mt-2 max-w-[65ch] text-sm leading-6 text-muted">
            Published events stay unchanged while edits move through review.
          </p>
        </div>
        <Link
          href={`/club-management/events/new?club=${active.clubId}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-medium text-bg"
        >
          <Plus className="h-4 w-4" /> New event
        </Link>
      </header>

      <nav
        className="flex gap-1 overflow-x-auto rounded-xl bg-surface p-1"
        aria-label="Event views"
      >
        {(
          [
            ["drafts", "Drafts"],
            ["review", "Awaiting review"],
            ["changes", "Changes requested"],
            ["upcoming", "Upcoming"],
            ["past", "Past"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={`/club-management/events?club=${active.clubId}&view=${key}`}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm ${view === key ? "bg-ink font-medium text-bg" : "text-muted hover:text-ink"}`}
          >
            {label}{" "}
            <span className="ml-1 opacity-60">{groups[key].length}</span>
          </Link>
        ))}
      </nav>

      {selected.length ? (
        <div className="overflow-hidden rounded-2xl bg-surface">
          {selected.map((event) => {
            const revision = latest.get(event.id);
            return (
              <article
                key={event.id}
                className="grid gap-4 border-b border-line/10 p-5 last:border-0 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <Link
                    className="font-medium hover:underline"
                    href={`/club-management/events/${event.id}?club=${active.clubId}`}
                  >
                    {event.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {new Date(event.date).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    · {event.venue}
                  </p>
                  {revision?.reviewNote ? (
                    <p className="mt-2 text-sm text-red-300">
                      {revision.reviewNote}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={revision?.status ?? event.status} />
                  <Link
                    className="text-sm text-muted hover:text-ink"
                    href={`/club-management/events/${event.id}?club=${active.clubId}`}
                  >
                    Open
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="grid min-h-56 place-items-center rounded-2xl bg-surface px-6 text-center">
          <div>
            <CalendarDays className="mx-auto h-6 w-6 text-subtle" />
            <h2 className="mt-4 font-medium">Nothing in this view</h2>
            <p className="mt-1 text-sm text-muted">
              Events will move here as their status changes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
