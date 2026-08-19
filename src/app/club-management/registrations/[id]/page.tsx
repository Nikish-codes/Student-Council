import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import { eventRegistrations, events } from "@/db/schema";
import { requireStudioClub } from "@/lib/club-studio";
import { toggleClubAttendance } from "../actions";

export default async function ClubRegistrationDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ club?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const active = await requireStudioClub(query.club);
  if (!active.canManageEvents && active.membershipRole !== "president") throw new Error("FORBIDDEN");
  const event = await db.query.events.findFirst({ where: eq(events.id, Number(id)) });
  if (!event || event.clubId !== active.clubId) notFound();
  const rows = await db.query.eventRegistrations.findMany({
    where: eq(eventRegistrations.eventId, event.id),
    orderBy: desc(eventRegistrations.createdAt),
    with: { attendees: true },
  });
  const checkedIn = rows.filter((row) => row.attendees.some((attendee) => attendee.checkedInAt)).length;

  return (
    <div className="space-y-7">
      <header>
        <Link className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink" href={`/club-management/registrations?club=${active.clubId}`}>
          <ArrowLeft className="h-4 w-4" /> Registrations
        </Link>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.03em]">{event.title}</h1>
        <p className="mt-2 text-sm text-muted">{rows.length} registered · {checkedIn} attended</p>
      </header>
      <div className="overflow-x-auto rounded-2xl bg-surface">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-subtle"><tr><th className="px-5 py-4 font-medium">Name</th><th className="px-5 py-4 font-medium">Email</th><th className="px-5 py-4 font-medium">Ticket</th><th className="px-5 py-4 font-medium">Status</th><th className="px-5 py-4 font-medium">Attendance</th></tr></thead>
          <tbody>
            {rows.map((row) => {
              const attendee = row.attendees[0];
              return (
                <tr key={row.id} className="border-t border-line/10">
                  <td className="px-5 py-4 font-medium">{row.name}</td>
                  <td className="px-5 py-4 text-muted">{row.email}</td>
                  <td className="px-5 py-4 text-xs text-muted">{attendee?.ticketCode ?? "Not issued"}</td>
                  <td className="px-5 py-4 capitalize text-muted">{row.status}</td>
                  <td className="px-5 py-4">
                    {attendee ? (
                      <form action={toggleClubAttendance.bind(null, active.clubId, event.id, attendee.id)}>
                        <button className={`min-h-9 rounded-xl px-3 text-xs font-medium ${attendee.checkedInAt ? "bg-emerald-500/15 text-emerald-400" : "border border-line/15 text-muted hover:text-ink"}`} type="submit">
                          {attendee.checkedInAt ? "Checked in" : "Mark attended"}
                        </button>
                      </form>
                    ) : <span className="text-subtle">No ticket</span>}
                  </td>
                </tr>
              );
            })}
            {!rows.length ? <tr><td colSpan={5} className="px-5 py-14 text-center text-muted">No registrations yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
