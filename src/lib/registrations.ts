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

/**
 * Create (or reuse) the single attendee/ticket for a registration. Retries on
 * the (astronomically rare) ticket-code collision against the unique index.
 */
async function ensureAttendee(registrationId: string, eventId: number): Promise<string> {
  const existing = await db.query.attendees.findFirst({
    where: eq(attendees.registrationId, registrationId),
  });
  if (existing) return existing.ticketCode;
  for (let attempt = 0; attempt < 5; attempt++) {
    const ticketCode = generateTicketCode();
    try {
      await db.insert(attendees).values({
        id: newId(),
        registrationId,
        eventId,
        ticketCode,
      });
      return ticketCode;
    } catch (err) {
      const msg = (err as Error).message || "";
      // SQLite unique-constraint collision → retry with a fresh code.
      if (!/UNIQUE|constraint/i.test(msg) || attempt === 4) throw err;
    }
  }
  throw new Error("Could not allocate a unique ticket code");
}

export async function registerForEvent(input: RegisterInput): Promise<RegisterResult> {
  const event = await db.query.events.findFirst({
    where: eq(events.id, input.eventId),
  });
  if (!event) throw new Error("Event not found");
  if (!event.registrationEnabled) throw new Error("Registration is not open for this event");
  if (event.status !== "published") throw new Error("Registration is not open");

  const amountPaise = event.priceInPaise ?? 0;
  const registrationId = newId();

  // Free event → confirm immediately + issue a ticket.
  if (amountPaise <= 0) {
    // Capacity enforced inside a transaction with a re-check to close the
    // check-then-insert window for concurrent free registrations.
    await db.transaction(async (tx) => {
      if (event.capacity && event.capacity > 0) {
        const taken = await tx.$count(
          eventRegistrations,
          and(
            eq(eventRegistrations.eventId, event.id),
            eq(eventRegistrations.status, "confirmed"),
          ),
        );
        if (taken >= event.capacity) throw new Error("This event is full");
      }
      await tx.insert(eventRegistrations).values({
        id: registrationId,
        eventId: event.id,
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        status: "confirmed",
        amountInPaise: 0,
        paymentStatus: "none",
      });
    });
    const ticketCode = await ensureAttendee(registrationId, event.id);
    return { kind: "free", ticketCode, registrationId };
  }

  // Paid event → needs Razorpay configured.
  if (!paymentsConfigured()) {
    throw new Error("Payments are not configured. Please contact the council.");
  }

  // Capacity preflight — order creation costs a Razorpay call, so fail fast.
  // Re-check at confirm time (race-safe) below.
  if (event.capacity && event.capacity > 0) {
    const taken = await confirmedCount(event.id);
    if (taken >= event.capacity) throw new Error("This event is full");
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

/**
 * Mark a registration paid + confirmed and issue a ticket (idempotent).
 * `expectedOrderId` (the order id from the signed Razorpay callback) MUST match
 * the registration's stored `razorpayOrderId` — this prevents replaying a valid
 * (order, payment, signature) triple from a cheaper event against a more
 * expensive registration id.
 */
export async function confirmPaidRegistration(
  registrationId: string,
  paymentId: string,
  signature: string | null,
  expectedOrderId: string | null,
): Promise<string> {
  // If the same payment id is already attached to a confirmed registration,
  // treat any further submission as idempotent success (or rejection if it
  // targets a different registration).
  const byPayment = await db.query.eventRegistrations.findFirst({
    where: eq(eventRegistrations.razorpayPaymentId, paymentId),
  });
  if (byPayment) {
    if (byPayment.id !== registrationId) {
      throw new Error("Payment already used for another registration");
    }
    return ensureAttendee(byPayment.id, byPayment.eventId);
  }

  const reg = await db.query.eventRegistrations.findFirst({
    where: eq(eventRegistrations.id, registrationId),
  });
  if (!reg) throw new Error("Registration not found");

  // The signed order id must match the order id we created for this
  // registration. Without this check a valid (orderA, paymentA, signature)
  // could be posted with registrationB and confirm it for free.
  if (expectedOrderId && reg.razorpayOrderId !== expectedOrderId) {
    throw new Error("Order does not match registration");
  }

  if (reg.status === "confirmed") {
    return ensureAttendee(reg.id, reg.eventId);
  }

  // Race-safe capacity re-check at confirm time: confirm only if we still
  // have a seat. Done inside a transaction so two near-simultaneous confirms
  // can't both squeeze past the limit.
  await db.transaction(async (tx) => {
    const ev = await tx.query.events.findFirst({
      where: eq(events.id, reg.eventId),
    });
    if (ev?.capacity && ev.capacity > 0) {
      const taken = await tx.$count(
        eventRegistrations,
        and(
          eq(eventRegistrations.eventId, reg.eventId),
          eq(eventRegistrations.status, "confirmed"),
        ),
      );
      if (taken >= ev.capacity) {
        throw new Error("This event filled before payment could be confirmed");
      }
    }
    await tx
      .update(eventRegistrations)
      .set({
        status: "confirmed",
        paymentStatus: "paid",
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(eventRegistrations.id, registrationId));
  });
  return ensureAttendee(reg.id, reg.eventId);
}

/** Webhook path: confirm by Razorpay order id (idempotent). */
export async function confirmByOrderId(orderId: string, paymentId: string): Promise<void> {
  const reg = await db.query.eventRegistrations.findFirst({
    where: eq(eventRegistrations.razorpayOrderId, orderId),
  });
  if (!reg || reg.status === "confirmed") return;
  // Webhook is authenticated by HMAC over the raw body, so the order id is
  // trusted — pass it through as the expectedOrderId guard.
  await confirmPaidRegistration(reg.id, paymentId, null, orderId);
}
