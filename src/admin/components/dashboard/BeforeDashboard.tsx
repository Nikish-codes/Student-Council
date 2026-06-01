import * as React from "react";
import { getPayload } from "payload";
import config from "@payload-config";
import Link from "next/link";
import { TaskIcon } from "./TaskIcon.tsx";
import { TASK_GROUPS } from "./tasks.ts";

/**
 * The custom admin landing page. Replaces the default "Collections / Globals"
 * grid with task-oriented cards + a recent-activity feed.
 *
 * Renders above the default dashboard content (Payload calls this
 * `beforeDashboard`). The default Collections/Globals cards are hidden via
 * admin.css further down the page — but the side nav still has them, so power
 * users aren't locked out.
 */

type RecentEntry = {
  id: string;
  title: string;
  collection: string;
  collectionLabel: string;
  updatedAt: string;
  href: string;
};

const COLLECTION_LABELS: Record<string, string> = {
  events: "Event",
  recaps: "Recap",
  announcements: "Announcement",
  clubs: "Club",
  "council-members": "Council member",
  highlights: "Highlight",
  faqs: "FAQ",
  "support-channels": "Support channel",
  media: "Media",
};

const TITLE_FIELDS: Record<string, string> = {
  events: "title",
  recaps: "title",
  announcements: "title",
  clubs: "name",
  "council-members": "name",
  highlights: "alt",
  faqs: "question",
  "support-channels": "name",
  media: "filename",
};

async function getRecentActivity(): Promise<RecentEntry[]> {
  try {
    const payload = await getPayload({ config });
    const collections = Object.keys(COLLECTION_LABELS);
    const queries = collections.map((slug) =>
      payload
        .find({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: slug as any,
          limit: 5,
          sort: "-updatedAt",
          depth: 0,
          overrideAccess: true,
        })
        .then((res) => ({ slug, docs: res.docs }))
        .catch(() => ({ slug, docs: [] as Array<Record<string, unknown>> })),
    );
    const results = await Promise.all(queries);
    const flat: RecentEntry[] = [];
    for (const { slug, docs } of results) {
      const titleField = TITLE_FIELDS[slug] ?? "id";
      for (const d of docs) {
        const doc = d as Record<string, unknown>;
        flat.push({
          id: String(doc.id ?? ""),
          title: String(doc[titleField] ?? doc.id ?? "Untitled"),
          collection: slug,
          collectionLabel: COLLECTION_LABELS[slug] ?? slug,
          updatedAt: String(doc.updatedAt ?? ""),
          href: `/admin/collections/${slug}/${doc.id}`,
        });
      }
    }
    return flat
      .filter((e) => e.updatedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 8);
  } catch {
    return [];
  }
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.round(hr / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function BeforeDashboard() {
  const recent = await getRecentActivity();

  return (
    <div className="wc-dash" data-wc-dash>
      <header className="wc-dash__hero">
        <p className="wc-dash__kicker">Woxsen Council CMS</p>
        <h1 className="wc-dash__title">What would you like to do today?</h1>
        <p className="wc-dash__lede">
          Pick a task below. Each one walks you through the smallest set of
          fields needed to ship the change. The full collections list is in the
          sidebar if you&apos;d rather edit things directly.
        </p>
      </header>

      <div className="wc-dash__groups">
        {TASK_GROUPS.map((group) => (
          <section key={group.id} className="wc-dash__group">
            <div className="wc-dash__group-head">
              <h2 className="wc-dash__group-title">{group.title}</h2>
              <p className="wc-dash__group-blurb">{group.blurb}</p>
            </div>
            <ul className="wc-dash__cards">
              {group.tasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={task.href}
                    className="wc-task"
                    data-primary={task.primary ? "true" : undefined}
                  >
                    <div className="wc-task__top">
                      <span className="wc-task__icon">
                        <TaskIcon
                          name={task.icon}
                          className="wc-task__icon-svg"
                        />
                      </span>
                      {task.badge ? (
                        <span className="wc-task__badge">{task.badge}</span>
                      ) : null}
                    </div>
                    <div className="wc-task__body">
                      <h3 className="wc-task__label">{task.label}</h3>
                      <p className="wc-task__blurb">{task.blurb}</p>
                    </div>
                    <span className="wc-task__arrow" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {recent.length > 0 && (
        <section className="wc-dash__recent">
          <div className="wc-dash__group-head">
            <h2 className="wc-dash__group-title">Recent activity</h2>
            <p className="wc-dash__group-blurb">
              The last few things edited across the whole CMS.
            </p>
          </div>
          <ul className="wc-recent">
            {recent.map((entry) => (
              <li
                key={`${entry.collection}-${entry.id}`}
                className="wc-recent__item"
              >
                <Link href={entry.href} className="wc-recent__link">
                  <span className="wc-recent__type">
                    {entry.collectionLabel}
                  </span>
                  <span className="wc-recent__title">{entry.title}</span>
                  <span className="wc-recent__time">
                    {formatRelative(entry.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
