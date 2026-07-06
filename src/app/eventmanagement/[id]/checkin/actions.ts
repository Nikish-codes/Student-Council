"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { events } from "@/db/schema";
import { requireOps, assertCanEditEvent } from "@/lib/rbac";
import { checkInAttendee } from "@/lib/registrations";

export type ScanResult = {
  status: "ok" | "already" | "wrong_event" | "invalid";
  message: string;
  name?: string;
  code?: string;
  checkedInAt?: string | null;
};

/** Called directly by the client scanner for each decoded QR / typed code. */
export async function scanCheckIn(
  eventId: number,
  scan: string,
): Promise<ScanResult> {
  const user = await requireOps();
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!event) return { status: "invalid", message: "Event not found." };
  assertCanEditEvent(user, event.clubId);

  const res = await checkInAttendee({
    scan,
    eventId,
    gate: "gate",
    userId: Number(user.id),
  });

  switch (res.status) {
    case "ok":
      return {
        status: "ok",
        message: "Checked in",
        name: res.ticket.name,
        code: res.ticket.ticketCode,
        checkedInAt: res.ticket.checkedInAt,
      };
    case "already":
      return {
        status: "already",
        message: `Already checked in${res.ticket.checkedInAt ? "" : ""}`,
        name: res.ticket.name,
        code: res.ticket.ticketCode,
        checkedInAt: res.ticket.checkedInAt,
      };
    case "wrong_event":
      return {
        status: "wrong_event",
        message: `Ticket is for "${res.ticket.event.title}"`,
        name: res.ticket.name,
        code: res.ticket.ticketCode,
      };
    default:
      return { status: "invalid", message: res.message };
  }
}
