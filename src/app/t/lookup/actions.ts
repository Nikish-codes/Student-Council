"use server";

import { auth } from "@/auth";
import { getTicketsByContact } from "@/lib/content";
import { rateLimit } from "@/lib/rate-limit";

export type FoundTicket = {
  code: string;
  title: string;
  date: string;
  checkedIn: boolean;
  href: string;
};

export type LookupState = {
  submitted?: boolean;
  tickets?: FoundTicket[];
  error?: string;
};

export async function lookupTickets(
  _prev: LookupState | undefined,
  fd: FormData,
): Promise<LookupState> {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return { error: "Not authorised." };
  }

  const contact = String(fd.get("contact") ?? "").trim();
  if (!contact) return { error: "Enter the email or phone you registered with." };

  // Throttle per contact to blunt enumeration.
  const limit = rateLimit(`lookup:${contact.toLowerCase()}`, 5, 60_000);
  if (!limit.ok) {
    return { error: "Too many lookups. Please try again in a minute." };
  }

  const tickets = await getTicketsByContact(contact);
  return {
    submitted: true,
    tickets: tickets.map((t) => ({
      code: t.ticketCode,
      title: t.event.title,
      date: t.event.date,
      checkedIn: Boolean(t.checkedInAt),
      href: `/t/${encodeURIComponent(t.ticketCode)}`,
    })),
  };
}
