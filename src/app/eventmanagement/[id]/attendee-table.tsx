"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, Ban, CheckCircle2, Search } from "lucide-react";
import { toast } from "sonner";
import type { OpsAttendee } from "@/lib/event-ops";
import { cancelAttendee } from "./actions";

const statusChip: Record<string, string> = {
  confirmed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  cancelled: "border-line/15 text-subtle line-through",
};

export function AttendeeTable({
  eventId,
  attendees,
}: {
  eventId: number;
  attendees: OpsAttendee[];
}) {
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return attendees;
    return attendees.filter(
      (a) =>
        a.name.toLowerCase().includes(term) ||
        a.email.toLowerCase().includes(term) ||
        (a.ticketCode ?? "").toLowerCase().includes(term) ||
        (a.phone ?? "").includes(term),
    );
  }, [q, attendees]);

  function copyLink(code: string) {
    const url = `${window.location.origin}/t/${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Ticket link copied"),
      () => toast.error("Couldn't copy"),
    );
  }

  function cancel(registrationId: string, name: string) {
    if (!confirm(`Cancel ${name}'s registration? Their ticket will stop working.`)) return;
    start(async () => {
      await cancelAttendee(eventId, registrationId);
      toast.success(`Cancelled ${name}`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-line/15 bg-surface-2 px-3">
        <Search className="h-4 w-4 text-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone or ticket…"
          className="w-full bg-transparent py-2.5 text-sm text-ink outline-none"
        />
        <span className="text-xs text-subtle">{filtered.length}</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Email</th>
              <th className="px-4 py-3 font-medium">Ticket</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.registrationId} className="border-t border-line/10">
                <td className="px-4 py-3 text-ink">
                  <span className="flex items-center gap-1.5">
                    {a.checkedInAt ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : null}
                    {a.name}
                    {a.manual ? (
                      <span className="rounded bg-line/10 px-1 text-[10px] uppercase text-subtle">
                        walk-in
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-muted sm:table-cell">{a.email}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">
                  {a.ticketCode ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                      statusChip[a.status] ?? "border-line/15 text-subtle"
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {a.ticketCode ? (
                      <button
                        type="button"
                        title="Copy ticket link"
                        onClick={() => copyLink(a.ticketCode!)}
                        className="rounded-lg p-1.5 text-subtle hover:bg-line/10 hover:text-ink"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    ) : null}
                    {a.status !== "cancelled" ? (
                      <button
                        type="button"
                        title="Cancel registration"
                        disabled={pending}
                        onClick={() => cancel(a.registrationId, a.name)}
                        className="rounded-lg p-1.5 text-subtle hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-subtle">
                  No attendees match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
