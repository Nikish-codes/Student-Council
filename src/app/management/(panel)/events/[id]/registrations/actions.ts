"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { attendees } from "@/db/schema";
import { requireOps } from "@/lib/rbac";

export async function toggleCheckIn(eventId: number, attendeeId: string) {
  const user = await requireOps();
  const row = await db.query.attendees.findFirst({ where: eq(attendees.id, attendeeId) });
  if (!row) return;
  await db
    .update(attendees)
    .set({
      checkedInAt: row.checkedInAt ? null : new Date().toISOString(),
      checkedInByUserId: row.checkedInAt ? null : Number(user.id),
    })
    .where(eq(attendees.id, attendeeId));
  revalidatePath(`/management/events/${eventId}/registrations`);
}

export async function checkInByTicket(
  eventId: number,
  _prev: { ok: boolean; message: string } | undefined,
  fd: FormData,
): Promise<{ ok: boolean; message: string }> {
  const user = await requireOps();
  const code = String(fd.get("ticket") ?? "").trim().toUpperCase();
  if (!code) return { ok: false, message: "Enter a ticket code." };

  const row = await db.query.attendees.findFirst({
    where: and(eq(attendees.ticketCode, code), eq(attendees.eventId, eventId)),
  });
  if (!row) return { ok: false, message: `No ticket "${code}" for this event.` };
  if (row.checkedInAt) {
    return { ok: false, message: `${code} already checked in.` };
  }
  await db
    .update(attendees)
    .set({ checkedInAt: new Date().toISOString(), checkedInByUserId: Number(user.id) })
    .where(eq(attendees.id, row.id));
  revalidatePath(`/management/events/${eventId}/registrations`);
  return { ok: true, message: `✓ Checked in ${code}` };
}
