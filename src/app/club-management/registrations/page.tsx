import Link from "next/link";
import { inArray } from "drizzle-orm";
import { TicketCheck } from "lucide-react";

import { db } from "@/db/client";
import { eventRegistrations } from "@/db/schema";
import { requireStudioClub } from "@/lib/club-studio";
import { hostedByClubWhere } from "@/lib/event-hosts";

export default async function ClubRegistrationsIndex({
  searchParams,
}: {
  searchParams: Promise<{ club?: string }>;
}) {
  const query = await searchParams;
  const active = await requireStudioClub(query.club);
  if (!active.canManageEvents && active.membershipRole !== "president")
    throw new Error("FORBIDDEN");
  const clubEvents = await db.query.events.findMany({
    where: hostedByClubWhere(active.clubId),
  });
  const registrations = clubEvents.length
    ? await db.query.eventRegistrations.findMany({
        where: inArray(
          eventRegistrations.eventId,
          clubEvents.map((event) => event.id),
        ),
        with: { attendees: true },
      })
    : [];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-subtle">People and attendance</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-[-0.03em]">
          Registrations
        </h1>
        <p className="mt-2 max-w-[65ch] text-sm leading-6 text-muted">
          Open an event to view registrants, ticket status, and attendance.
        </p>
      </header>
      {clubEvents.length ? (
        <div className="overflow-hidden rounded-2xl bg-surface">
          {clubEvents.map((event) => {
            const eventRegs = registrations.filter(
              (registration) => registration.eventId === event.id,
            );
            const checkedIn = eventRegs.filter((registration) =>
              registration.attendees.some((attendee) => attendee.checkedInAt),
            ).length;
            return (
              <Link
                key={event.id}
                href={`/club-management/registrations/${event.id}?club=${active.clubId}`}
                className="grid gap-3 border-b border-line/10 p-5 transition-colors hover:bg-line/5 last:border-0 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <h2 className="font-medium">{event.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {new Date(event.date).toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                    })}
                  </p>
                </div>
                <p className="text-sm text-muted">
                  <strong className="font-semibold text-ink">
                    {eventRegs.length}
                  </strong>{" "}
                  registered · {checkedIn} attended
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="grid min-h-56 place-items-center rounded-2xl bg-surface text-center">
          <div>
            <TicketCheck className="mx-auto h-6 w-6 text-subtle" />
            <h2 className="mt-4 font-medium">No events yet</h2>
          </div>
        </div>
      )}
    </div>
  );
}
