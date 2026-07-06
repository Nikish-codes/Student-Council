import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ScanLine, Activity } from "lucide-react";

import { requireOps, assertCanEditEvent } from "@/lib/rbac";
import { getEventOpsDetail } from "@/lib/event-ops";
import { getEventAuditLog } from "@/lib/audit";
import { ConsoleTools } from "./console-tools";
import { AttendeeTable } from "./attendee-table";

export const dynamic = "force-dynamic";

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}
function ago(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

const ACTION_LABEL: Record<string, string> = {
  checkin: "checked in",
  manual_add: "added walk-in",
  cancel: "cancelled",
};

export default async function EventConsole({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isFinite(eventId)) notFound();

  const user = await requireOps();
  const detail = await getEventOpsDetail(eventId);
  if (!detail) notFound();
  assertCanEditEvent(user, detail.event.clubId);

  const audit = await getEventAuditLog(eventId, 20);
  const { event, stats } = detail;
  const capPct =
    event.capacity && event.capacity > 0
      ? Math.min(100, Math.round((stats.confirmed / event.capacity) * 100))
      : null;
  const checkinPct =
    stats.confirmed > 0 ? Math.round((stats.checkedIn / stats.confirmed) * 100) : 0;

  const cards = [
    { label: "Registered", value: stats.registered },
    { label: "Confirmed", value: stats.confirmed },
    { label: "Checked in", value: `${stats.checkedIn} · ${checkinPct}%` },
    { label: "Revenue", value: rupees(stats.revenuePaise) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/eventmanagement"
          className="inline-flex items-center gap-2 text-xs text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" /> All events
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker text-subtle">{event.category}</p>
            <h1 className="display mt-1 text-3xl text-ink">{event.title}</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/eventmanagement/${eventId}/checkin`}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90"
            >
              <ScanLine className="h-4 w-4" /> Check-in station
            </Link>
            <a
              href={`/management/events/${eventId}/registrations/export`}
              className="inline-flex items-center gap-2 rounded-full border border-line/15 px-4 py-2 text-sm text-ink hover:border-line/40"
            >
              <Download className="h-4 w-4" /> CSV
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="surface-card rounded-2xl p-5">
            <p className="text-2xl font-semibold tabular-nums text-ink">{c.value}</p>
            <p className="mt-1 text-sm text-muted">{c.label}</p>
          </div>
        ))}
      </div>

      {capPct != null ? (
        <div className="surface-card rounded-2xl p-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${capPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-subtle">
            {stats.confirmed} of {event.capacity} seats filled ({capPct}%)
          </p>
        </div>
      ) : null}

      <ConsoleTools eventId={eventId} />

      <AttendeeTable eventId={eventId} attendees={detail.attendees} />

      <section className="flex flex-col gap-3">
        <h2 className="kicker flex items-center gap-2 text-subtle">
          <Activity className="h-4 w-4" /> Activity
        </h2>
        {audit.length === 0 ? (
          <p className="text-sm text-subtle">No activity yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {audit.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 border-b border-line/8 pb-1.5">
                <span className="text-muted">
                  <span className="text-ink">{a.actor?.name ?? "System"}</span>{" "}
                  {ACTION_LABEL[a.action] ?? a.action}{" "}
                  {(a.meta as { name?: string } | null)?.name ? (
                    <span className="text-ink">{(a.meta as { name?: string }).name}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-subtle">{ago(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
