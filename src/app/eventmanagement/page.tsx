import Link from "next/link";
import { ArrowRight, CalendarDays, Users, TicketCheck, IndianRupee } from "lucide-react";

import { requireOps } from "@/lib/rbac";
import { getEventsForOps, type EventOpsCard } from "@/lib/event-ops";

export const dynamic = "force-dynamic";

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(+d)
    ? iso
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function bucketOf(e: EventOpsCard): "live" | "upcoming" | "past" {
  const start = +new Date(e.date);
  const now = Date.now();
  const dayMs = 86_400_000;
  if (now >= start - dayMs && now <= start + dayMs) return "live";
  return start > now ? "upcoming" : "past";
}

function EventRow({ e }: { e: EventOpsCard }) {
  const capPct =
    e.capacity && e.capacity > 0
      ? Math.min(100, Math.round((e.confirmed / e.capacity) * 100))
      : null;
  const checkinPct =
    e.confirmed > 0 ? Math.round((e.checkedIn / e.confirmed) * 100) : 0;

  return (
    <Link
      href={`/eventmanagement/${e.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-line/12 bg-surface p-5 transition-colors hover:border-line/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="kicker text-subtle">{e.category}</p>
          <h3 className="truncate text-lg font-medium text-ink">{e.title}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(e.date)}
            {e.status !== "published" ? (
              <span className="ml-1 rounded-full border border-line/15 px-1.5 py-0.5 text-[10px] uppercase text-subtle">
                {e.status}
              </span>
            ) : null}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat icon={<Users className="h-3.5 w-3.5" />} value={e.registered} label="Reg" />
        <Stat value={e.confirmed} label="Confirmed" />
        <Stat icon={<TicketCheck className="h-3.5 w-3.5" />} value={`${e.checkedIn}`} label={`${checkinPct}% in`} />
        <Stat icon={<IndianRupee className="h-3.5 w-3.5" />} value={rupees(e.revenuePaise).replace("₹", "")} label="Revenue" />
      </div>

      {capPct != null ? (
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${capPct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-subtle">
            {e.confirmed}/{e.capacity} seats ({capPct}%)
          </p>
        </div>
      ) : null}
    </Link>
  );
}

function Stat({
  value,
  label,
  icon,
}: {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-surface-2 px-1 py-2">
      <p className="flex items-center justify-center gap-1 text-base font-semibold tabular-nums text-ink">
        {icon}
        {value}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-subtle">{label}</p>
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
    <div className="flex flex-col gap-8">
      <div>
        <p className="kicker text-accent">Event operations</p>
        <h1 className="display mt-1 text-3xl text-ink">Cockpit</h1>
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
        <p className="text-sm text-subtle">No events yet.</p>
      ) : (
        sections.map(({ key, label }) =>
          groups[key].length > 0 ? (
            <section key={key} className="flex flex-col gap-3">
              <h2 className="kicker text-subtle">{label}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groups[key].map((e) => (
                  <EventRow key={e.id} e={e} />
                ))}
              </div>
            </section>
          ) : null,
        )
      )}
    </div>
  );
}
