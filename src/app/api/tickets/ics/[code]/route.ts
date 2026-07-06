import { getTicketByCode } from "@/lib/content";
import { buildIcs } from "@/lib/ics";
import { ticketUrl } from "@/lib/site-url";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const ticket = await getTicketByCode(code);
  if (!ticket) {
    return new Response("Ticket not found", { status: 404 });
  }

  const start = new Date(ticket.event.date);
  const end = ticket.event.endDate ? new Date(ticket.event.endDate) : undefined;
  const url = ticketUrl(ticket.ticketCode);

  const ics = buildIcs({
    uid: `ticket-${ticket.ticketCode}@woxsenstudentcouncil.com`,
    title: ticket.event.title,
    location: ticket.event.venue,
    description: `Your ticket (${ticket.ticketCode}) for ${ticket.event.title}. View it: ${url}`,
    start: Number.isNaN(+start) ? new Date() : start,
    end: end && !Number.isNaN(+end) ? end : undefined,
    url,
  });

  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${ticket.event.slug || "event"}.ics"`,
    },
  });
}
