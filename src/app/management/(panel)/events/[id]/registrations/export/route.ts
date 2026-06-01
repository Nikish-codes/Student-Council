import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { eventRegistrations as regT, events as eventsT } from "@/db/schema";
import { requireOps, assertCanEditEvent } from "@/lib/rbac";

export const runtime = "nodejs";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const eventId = Number(id);

  let user;
  try {
    user = await requireOps();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  const event = await db.query.events.findFirst({ where: eq(eventsT.id, eventId) });
  if (!event) return new Response("Not found", { status: 404 });
  try {
    assertCanEditEvent(user, event.clubId);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const regs = await db.query.eventRegistrations.findMany({
    where: eq(regT.eventId, eventId),
    orderBy: desc(regT.createdAt),
    with: { attendees: true },
  });

  const header = ["Name", "Email", "Phone", "Status", "Amount (₹)", "Ticket", "Checked in at", "Registered at"];
  const lines = regs.map((r) => {
    const a = r.attendees[0];
    return [
      r.name, r.email, r.phone ?? "", r.status,
      ((r.amountInPaise || 0) / 100).toString(),
      a?.ticketCode ?? "", a?.checkedInAt ?? "", r.createdAt,
    ].map(csvCell).join(",");
  });
  const csv = [header.join(","), ...lines].join("\n");

  const slug = event.slug || `event-${eventId}`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}-registrations.csv"`,
    },
  });
}
