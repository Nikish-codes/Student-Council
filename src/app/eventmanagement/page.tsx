import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";

import { requireOps } from "@/lib/rbac";
import { getEventsForOps, type EventOpsCard } from "@/lib/event-ops";

export const dynamic = "force-dynamic";

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}
function compactRupees(paise: number): string {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(r % 100000 === 0 ? 0 : 1)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(r % 1000 === 0 ? 0 : 1)}k`;
  return `₹${r.toLocaleString("en-IN")}`;
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(+d)
    ? iso
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type Bucket = "live" | "upcoming" | "past";
function bucketOf(e: EventOpsCard): Bucket {
  const start = +new Date(e.date);
  const now = Date.now();
  const dayMs = 86_400_000;
  if (now >= start - dayMs && now <= start + dayMs) return "live";
  return start > now ? "upcoming" : "past";
}

/** Compact SVG progress ring — the card's hero metric (check-in rate). */
function ProgressRing({
  pct,
  accent,
  children,
}: {
  pct: number;
  accent: boolean;
  children: React.ReactNode;
}) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="stroke-line/10" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className={accent ? "stroke-accent" : "stroke-ink/70"}
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

const BUCKET_DOT: Record<Bucket, string> = {
  live: "bg-accent",
  upcoming: "bg-emerald-400",
  past: "bg-subtle",
};

function EventCard({ e }: { e: EventOpsCard }) {
  const bucket = bucketOf(e);
  const isLive = bucket === "live";
  const checkinPct =
    e.confirmed > 0 ? Math.round((e.checkedIn / e.confirmed) * 100) : 0;
  const capPct =
    e.capacity && e.capacity > 0
      ? Math.min(100, Math.round((e.confirmed / e.capacity) * 100))
      : null;

  return (
    <Link
      href={`/eventmanagement/${e.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-surface/60 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface/90 ${
        isLive
          ? "border-accent/30 hover:border-accent/60"
          : "border-line/10 hover:border-line/25"
      }`}
    >
      {/* Live accent glow */}
      {isLive ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/15 blur-2xl"
        />
      ) : null}

      {/* Header: status + arrow */}
      <div className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            {isLive ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
            ) : null}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${BUCKET_DOT[bucket]}`} />
          </span>
          <span className="kicker text-[11px] text-subtle">{e.category}</span>
          {e.status !== "published" ? (
            <span className="rounded-full border border-line/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-subtle">
              {e.status}
            </span>
          ) : null}
        </span>
        <ArrowUpRight className="h-4 w-4 text-subtle transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
      </div>

      {/* Title + date */}
      <h3 className="display mt-3 line-clamp-2 text-2xl leading-tight text-ink">
        {e.title}
      </h3>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-subtle" />
        {fmtDate(e.date)}
      </p>

      {/* Hero row: check-in ring + supporting figures */}
      <div className="mt-5 flex items-center gap-4 border-t border-line/8 pt-5">
        <ProgressRing pct={checkinPct} accent={isLive}>
          <span className="text-sm font-semibold leading-none tabular-nums text-ink">
            {checkinPct}%
          </span>
          <span className="mt-0.5 text-[8px] uppercase tracking-wider text-subtle">in</span>
        </ProgressRing>

        <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2">
          <Figure value={e.checkedIn} sub={`/ ${e.confirmed}`} label="Checked in" />
          <Figure value={e.registered} label="Registered" />
          <Figure value={compactRupees(e.revenuePaise)} label="Revenue" />
          <Figure
            value={capPct != null ? `${capPct}%` : "—"}
            label={e.capacity ? `${e.confirmed}/${e.capacity} seats` : "No cap"}
          />
        </div>
      </div>

      {/* Capacity bar */}
      {capPct != null ? (
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-line/8">
          <div
            className={`h-full rounded-full ${capPct >= 100 ? "bg-emerald-400" : "bg-accent"}`}
            style={{ width: `${capPct}%` }}
          />
        </div>
      ) : null}
    </Link>
  );
}

function Figure({
  value,
  sub,
  label,
}: {
  value: string | number;
  sub?: string;
  label: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-baseline gap-1 leading-none">
        <span className="text-base font-semibold tabular-nums text-ink">{value}</span>
        {sub ? <span className="text-[11px] tabular-nums text-subtle">{sub}</span> : null}
      </p>
      <p className="mt-1 truncate text-[10px] uppercase tracking-wide text-subtle">{label}</p>
    </div>
  );
}

export default async function EventOpsOverview() {
  const user = await requireOps();
  const all = await getEventsForOps(user);

  const groups = {
    live: all.filter((e) => bucketOf(e) === "live"),
    upcoming: all.filter((e) => bucketOf(e) === "upcoming"),
    past: all.filter((e) => bucketOf(e) === "past"),
  };

  const totals = all.reduce(
    (t, e) => ({
      confirmed: t.confirmed + e.confirmed,
      checkedIn: t.checkedIn + e.checkedIn,
      revenue: t.revenue + e.revenuePaise,
    }),
    { confirmed: 0, checkedIn: 0, revenue: 0 },
  );

  const sections: { key: keyof typeof groups; label: string }[] = [
    { key: "live", label: "Happening now" },
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="kicker text-accent">Event operations</p>
        <h1 className="display mt-1 text-4xl text-ink">Cockpit</h1>
        <p className="mt-2 text-sm text-muted">
          Live registrations, check-in and revenue across every event.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="surface-card rounded-2xl p-5">
          <p className="text-3xl font-semibold tabular-nums">{totals.confirmed}</p>
          <p className="mt-1 text-sm text-muted">Confirmed tickets</p>
        </div>
        <div className="surface-card rounded-2xl p-5">
          <p className="text-3xl font-semibold tabular-nums">{totals.checkedIn}</p>
          <p className="mt-1 text-sm text-muted">Checked in</p>
        </div>
        <div className="surface-card rounded-2xl p-5">
          <p className="text-3xl font-semibold tabular-nums">{rupees(totals.revenue)}</p>
          <p className="mt-1 text-sm text-muted">Revenue</p>
        </div>
      </div>

      {all.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line/15 p-10 text-center text-sm text-subtle">
          No events yet.
        </p>
      ) : (
        sections.map(({ key, label }) =>
          groups[key].length > 0 ? (
            <section key={key} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <h2 className="kicker text-subtle">{label}</h2>
                <span className="font-mono text-xs text-subtle/60">
                  {String(groups[key].length).padStart(2, "0")}
                </span>
                <span className="h-px flex-1 bg-line/8" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groups[key].map((e) => (
                  <EventCard key={e.id} e={e} />
                ))}
              </div>
            </section>
          ) : null,
        )
      )}
    </div>
  );
}
