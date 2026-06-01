import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Download } from "lucide-react";
import { db } from "@/db/client";
import { events as eventsT, eventRegistrations as regT } from "@/db/schema";
import { requireOps, assertCanEditEvent } from "@/lib/rbac";
import { CheckInBox } from "./check-in-box";
import { CheckInToggle } from "./check-in-toggle";

export default async function RegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventId = Number(id);
  const user = await requireOps();

  const event = await db.query.events.findFirst({ where: eq(eventsT.id, eventId) });
  if (!event) notFound();
  assertCanEditEvent(user, event.clubId);

  const regs = await db.query.eventRegistrations.findMany({
    where: eq(regT.eventId, eventId),
    orderBy: desc(regT.createdAt),
    with: { attendees: true },
  });

  const confirmed = regs.filter((r) => r.status === "confirmed");
  const checkedIn = confirmed.filter((r) => r.attendees[0]?.checkedInAt).length;
  const revenue = confirmed.reduce((sum, r) => sum + (r.amountInPaise || 0), 0);

  const stats = [
    { label: "Registrations", value: regs.length },
    { label: "Confirmed", value: confirmed.length },
    { label: "Checked in", value: checkedIn },
    { label: "Revenue", value: `₹${(revenue / 100).toLocaleString("en-IN")}` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/management/events/${eventId}`} className="inline-flex items-center gap-2 text-xs text-muted hover:text-ink">
          <ArrowLeft className="h-3 w-3" /> Back to event
        </Link>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <p className="kicker text-subtle">Registrations</p>
            <h1 className="display mt-1 text-3xl">{event.title}</h1>
          </div>
          <a
            href={`/management/events/${eventId}/registrations/export`}
            className="inline-flex items-center gap-2 rounded-full border border-line/15 px-4 py-2 text-sm text-ink hover:border-line/40"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="surface-card rounded-2xl p-5">
            <p className="text-3xl font-semibold tabular-nums">{s.value}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <CheckInBox eventId={eventId} />

      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Ticket</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {regs.map((r) => {
              const a = r.attendees[0];
              return (
                <tr key={r.id} className="border-t border-line/10">
                  <td className="px-4 py-3 text-ink">{r.name}</td>
                  <td className="px-4 py-3 text-muted">{r.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{a?.ticketCode ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${
                      r.status === "confirmed"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : r.status === "pending"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                          : "border-line/15 text-subtle"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a ? (
                      <CheckInToggle eventId={eventId} attendeeId={a.id} checkedIn={!!a.checkedInAt} />
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {regs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-subtle">No registrations yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
