"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { eventRegistrations, events } from "@/db/schema";
import { requireOps, assertCanEditEvent } from "@/lib/rbac";
import { checkInAttendee, manualRegister } from "@/lib/registrations";
import { logAudit } from "@/lib/audit";

async function guardEvent(eventId: number) {
  const user = await requireOps();
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!event) throw new Error("Event not found");
  assertCanEditEvent(user, event.clubId);
  return { user, event };
}

export type ConsoleActionState = { ok: boolean; message: string } | undefined;

/** Manual/typed check-in from the console's quick box. */
export async function consoleCheckIn(
  eventId: number,
  _prev: ConsoleActionState,
  fd: FormData,
): Promise<ConsoleActionState> {
  const { user } = await guardEvent(eventId);
  const scan = String(fd.get("scan") ?? "").trim();
  if (!scan) return { ok: false, message: "Enter or scan a ticket." };

  const res = await checkInAttendee({
    scan,
    eventId,
    gate: "console",
    userId: Number(user.id),
  });
  revalidatePath(`/eventmanagement/${eventId}`);

  switch (res.status) {
    case "ok":
      return { ok: true, message: `✓ Checked in ${res.ticket.name} (${res.ticket.ticketCode})` };
    case "already":
      return { ok: false, message: `${res.ticket.ticketCode} already checked in.` };
    case "wrong_event":
      return { ok: false, message: `That ticket is for "${res.ticket.event.title}".` };
    default:
      return { ok: false, message: res.message };
  }
}

/** Staff-add a walk-in attendee. */
export async function addAttendee(
  eventId: number,
  _prev: ConsoleActionState,
  fd: FormData,
): Promise<ConsoleActionState> {
  const { user } = await guardEvent(eventId);
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();
  if (!name || !email) return { ok: false, message: "Name and email are required." };

  const res = await manualRegister({
    eventId,
    name,
    email,
    phone: phone || undefined,
    byUserId: Number(user.id),
  });
  if (!res.alreadyRegistered) {
    await logAudit({
      actorUserId: Number(user.id),
      eventId,
      action: "manual_add",
      targetId: res.registrationId,
      meta: { name, email },
    });
  }
  revalidatePath(`/eventmanagement/${eventId}`);
  return {
    ok: true,
    message: res.alreadyRegistered
      ? `${name} was already registered — ticket ${res.ticketCode}.`
      : `Added ${name} · ticket ${res.ticketCode}.`,
  };
}

/** Cancel a registration (its ticket can no longer check in). */
export async function cancelAttendee(eventId: number, registrationId: string) {
  const { user } = await guardEvent(eventId);
  await db
    .update(eventRegistrations)
    .set({ status: "cancelled", updatedAt: new Date().toISOString() })
    .where(eq(eventRegistrations.id, registrationId));
  await logAudit({
    actorUserId: Number(user.id),
    eventId,
    action: "cancel",
    targetId: registrationId,
  });
  revalidatePath(`/eventmanagement/${eventId}`);
}
