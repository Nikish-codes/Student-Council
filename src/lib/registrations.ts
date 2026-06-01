import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { attendees, eventRegistrations, events } from "@/db/schema";
import { createRazorpayOrder, paymentsConfigured } from "@/lib/razorpay";
import { generateTicketCode, newId } from "@/lib/tickets";

export type RegisterInput = {
  eventId: number;
  name: string;
  email: string;
  phone?: string;
};

export type RegisterResult =
  | { kind: "free"; ticketCode: string; registrationId: string }
  | {
      kind: "paid";
      registrationId: string;
      orderId: string;
      amountPaise: number;
      keyId: string;
    };

/** Count confirmed registrations (for capacity enforcement). */
async function confirmedCount(eventId: number): Promise<number> {
  return db.$count(
    eventRegistrations,
    and(
      eq(eventRegistrations.eventId, eventId),
      eq(eventRegistrations.status, "confirmed"),
    ),
  );
}

/** Create (or reuse) the single attendee/ticket for a registration. */
async function ensureAttendee(registrationId: string, eventId: number): Promise<string> {
  const existing = await db.query.attendees.findFirst({
    where: eq(attendees.registrationId, registrationId),
  });
  if (existing) return existing.ticketCode;
  const ticketCode = generateTicketCode();
  await db.insert(attendees).values({
    id: newId(),
    registrationId,
    eventId,
    ticketCode,
  });
  return ticketCode;
}

export async function registerForEvent(input: RegisterInput): Promise<RegisterResult> {
  const event = await db.query.events.findFirst({
    where: eq(events.id, input.eventId),
  });
  if (!event) throw new Error("Event not found");
  if (!event.registrationEnabled) throw new Error("Registration is not open for this event");
  if (event.status !== "published") throw new Error("Registration is not open");

  // Capacity check (confirmed seats).
  if (event.capacity && event.capacity > 0) {
    const taken = await confirmedCount(event.id);
    if (taken >= event.capacity) throw new Error("This event is full");
  }

  const amountPaise = event.priceInPaise ?? 0;
  const registrationId = newId();

  // Free event → confirm immediately + issue a ticket.
  if (amountPaise <= 0) {
    await db.insert(eventRegistrations).values({
      id: registrationId,
      eventId: event.id,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      status: "confirmed",
      amountInPaise: 0,
      paymentStatus: "none",
    });
    const ticketCode = await ensureAttendee(registrationId, event.id);
    return { kind: "free", ticketCode, registrationId };
  }

  // Paid event → needs Razorpay configured.
  if (!paymentsConfigured()) {
    throw new Error("Payments are not configured. Please contact the council.");
  }

  const order = await createRazorpayOrder(amountPaise, registrationId);
  await db.insert(eventRegistrations).values({
    id: registrationId,
    eventId: event.id,
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    status: "pending",
    amountInPaise: amountPaise,
    razorpayOrderId: order.id,
    paymentStatus: "created",
  });

  return {
    kind: "paid",
    registrationId,
    orderId: order.id,
    amountPaise,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "",
  };
}

/** Mark a registration paid + confirmed and issue a ticket (idempotent). */
export async function confirmPaidRegistration(
  registrationId: string,
  paymentId: string,
  signature: string | null,
): Promise<string> {
  const reg = await db.query.eventRegistrations.findFirst({
    where: eq(eventRegistrations.id, registrationId),
  });
  if (!reg) throw new Error("Registration not found");
  if (reg.status === "confirmed") {
    return ensureAttendee(reg.id, reg.eventId);
  }
  await db
    .update(eventRegistrations)
    .set({
      status: "confirmed",
      paymentStatus: "paid",
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(eventRegistrations.id, registrationId));
  return ensureAttendee(reg.id, reg.eventId);
}

/** Webhook path: confirm by Razorpay order id (idempotent). */
export async function confirmByOrderId(orderId: string, paymentId: string): Promise<void> {
  const reg = await db.query.eventRegistrations.findFirst({
    where: eq(eventRegistrations.razorpayOrderId, orderId),
  });
  if (!reg || reg.status === "confirmed") return;
  await confirmPaidRegistration(reg.id, paymentId, null);
}
