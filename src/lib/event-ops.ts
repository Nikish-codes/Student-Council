import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { attendees, eventRegistrations, events } from "@/db/schema";
import type { SessionUser } from "@/lib/rbac";

export type EventOpsCard = {
  id: number;
  slug: string;
  title: string;
  date: string;
  status: string;
  category: string;
  capacity: number | null;
  clubId: number | null;
  registered: number;
  confirmed: number;
  checkedIn: number;
  revenuePaise: number;
};

/** Per-event registration aggregates keyed by eventId. */
async function regAggregates(eventIds: number[]) {
  if (eventIds.length === 0) return new Map<number, { registered: number; confirmed: number; revenue: number }>();
  const rows = await db
    .select({
      eventId: eventRegistrations.eventId,
      registered: sql<number>`count(*)`,
      confirmed: sql<number>`sum(case when ${eventRegistrations.status} = 'confirmed' then 1 else 0 end)`,
      revenue: sql<number>`sum(case when ${eventRegistrations.status} = 'confirmed' then ${eventRegistrations.amountInPaise} else 0 end)`,
    })
    .from(eventRegistrations)
    .where(inArray(eventRegistrations.eventId, eventIds))
    .groupBy(eventRegistrations.eventId);
  return new Map(
    rows.map((r) => [
      r.eventId,
      { registered: Number(r.registered), confirmed: Number(r.confirmed), revenue: Number(r.revenue) },
    ]),
  );
}

/** Per-event checked-in counts keyed by eventId. */
async function checkinAggregates(eventIds: number[]) {
  if (eventIds.length === 0) return new Map<number, number>();
  const rows = await db
    .select({
      eventId: attendees.eventId,
      checkedIn: sql<number>`sum(case when ${attendees.checkedInAt} is not null then 1 else 0 end)`,
    })
    .from(attendees)
    .where(inArray(attendees.eventId, eventIds))
    .groupBy(attendees.eventId);
  return new Map(rows.map((r) => [r.eventId, Number(r.checkedIn)]));
}

/** Overview cards for every event the user may see (club leads → own club). */
export async function getEventsForOps(user: SessionUser): Promise<EventOpsCard[]> {
  const scoped =
    user.role === "club_lead" && user.clubId
      ? await db.query.events.findMany({
          where: eq(events.clubId, user.clubId),
          orderBy: desc(events.date),
        })
      : await db.query.events.findMany({ orderBy: desc(events.date) });

  const ids = scoped.map((e) => e.id);
  const [regs, checkins] = await Promise.all([
    regAggregates(ids),
    checkinAggregates(ids),
  ]);

  return scoped.map((e) => {
    const r = regs.get(e.id) ?? { registered: 0, confirmed: 0, revenue: 0 };
    return {
      id: e.id,
      slug: e.slug,
      title: e.title,
      date: e.date,
      status: e.status,
      category: e.category,
      capacity: e.capacity ?? null,
      clubId: e.clubId ?? null,
      registered: r.registered,
      confirmed: r.confirmed,
      checkedIn: checkins.get(e.id) ?? 0,
      revenuePaise: r.revenue,
    };
  });
}

export type OpsAttendee = {
  registrationId: string;
  attendeeId: string | null;
  ticketCode: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  paymentStatus: string;
  amountInPaise: number;
  checkedInAt: string | null;
  manual: boolean;
};

export type EventOpsDetail = {
  event: typeof events.$inferSelect;
  attendees: OpsAttendee[];
  stats: {
    registered: number;
    confirmed: number;
    checkedIn: number;
    revenuePaise: number;
  };
};

/** Full attendee list + stats for one event's console. */
export async function getEventOpsDetail(
  eventId: number,
): Promise<EventOpsDetail | null> {
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!event) return null;

  const regs = await db.query.eventRegistrations.findMany({
    where: eq(eventRegistrations.eventId, eventId),
    orderBy: desc(eventRegistrations.createdAt),
    with: { attendees: true },
  });

  const list: OpsAttendee[] = regs.map((r) => {
    const a = r.attendees[0];
    return {
      registrationId: r.id,
      attendeeId: a?.id ?? null,
      ticketCode: a?.ticketCode ?? null,
      name: r.name,
      email: r.email,
      phone: r.phone,
      status: r.status,
      paymentStatus: r.paymentStatus,
      amountInPaise: r.amountInPaise ?? 0,
      checkedInAt: a?.checkedInAt ?? null,
      manual: Boolean((r.meta as { manual?: boolean } | null)?.manual),
    };
  });

  const confirmed = list.filter((a) => a.status === "confirmed");
  return {
    event,
    attendees: list,
    stats: {
      registered: list.length,
      confirmed: confirmed.length,
      checkedIn: confirmed.filter((a) => a.checkedInAt).length,
      revenuePaise: confirmed.reduce((s, a) => s + a.amountInPaise, 0),
    },
  };
}

/** Convenience count for the live check-in counter (cheap, single query). */
export async function getCheckedInCount(eventId: number): Promise<{ checkedIn: number; confirmed: number }> {
  const [checkedIn, confirmed] = await Promise.all([
    db.$count(attendees, and(eq(attendees.eventId, eventId), sql`${attendees.checkedInAt} is not null`)),
    db.$count(eventRegistrations, and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "confirmed"))),
  ]);
  return { checkedIn, confirmed };
}
