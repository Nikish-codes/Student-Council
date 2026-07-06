import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, CheckCircle2, ShieldCheck } from "lucide-react";

import { getTicketByCode } from "@/lib/content";
import { signTicket } from "@/lib/ticket-sign";
import { qrSvg } from "@/lib/qr";
import { identiconSvg } from "@/lib/identicon";
import { ticketUrl } from "@/lib/site-url";
import { TicketActions } from "./ticket-actions";

// Check-in state changes over time — never serve a stale cached ticket.
export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  return d.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const ticket = await getTicketByCode(code);
  if (!ticket) return { title: "Ticket not found" };
  return {
    title: `Ticket · ${ticket.event.title}`,
    description: `${ticket.name}'s ticket for ${ticket.event.title}.`,
    robots: { index: false, follow: false },
  };
}

export default async function TicketPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const ticket = await getTicketByCode(code);
  if (!ticket) notFound();

  const sig = signTicket(ticket.ticketCode);
  const scanUrl = ticketUrl(ticket.ticketCode, sig);
  const qr = await qrSvg(scanUrl);
  const identicon = identiconSvg(ticket.ticketCode, "rgb(var(--accent))");
  const checkedIn = Boolean(ticket.checkedInAt);
  const shortId = ticket.attendeeId.slice(0, 8).toUpperCase();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-8 print:py-0">
      {/* Ticket card */}
      <div className="overflow-hidden rounded-3xl border border-line/15 bg-surface shadow-2xl print:border-black/20 print:shadow-none">
        {/* Event header / banner */}
        <div
          className="relative flex min-h-[132px] flex-col justify-end p-5"
          style={
            ticket.event.banner
              ? {
                  backgroundImage: `linear-gradient(to top, rgb(var(--bg)/0.92), rgb(var(--bg)/0.35)), url(${ticket.event.banner})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : { background: "rgb(var(--surface-2))" }
          }
        >
          <span className="kicker text-accent">{ticket.event.category || "Event"}</span>
          <h1 className="display mt-1 text-2xl leading-tight text-ink">
            {ticket.event.title}
          </h1>
        </div>

        {/* Event meta */}
        <div className="flex flex-col gap-2 border-b border-dashed border-line/15 px-5 py-4 text-sm text-muted">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-subtle" />
            {fmtDate(ticket.event.date)}
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-subtle" />
            {ticket.event.venue || "Venue TBA"}
          </span>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center gap-3 px-5 py-6">
          <div
            className="w-52 rounded-2xl bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
            // QR is intentionally always dark-on-white for scan reliability.
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <p className="font-mono text-lg tracking-widest text-ink">
            {ticket.ticketCode}
          </p>
          {checkedIn ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Checked in · {fmtDate(ticket.checkedInAt!)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <ShieldCheck className="h-3.5 w-3.5" />
              Valid ticket
            </span>
          )}
        </div>

        {/* Attendee + identicon */}
        <div className="flex items-center justify-between gap-3 border-t border-dashed border-line/15 px-5 py-4">
          <div className="min-w-0">
            <p className="kicker text-subtle">Attendee</p>
            <p className="truncate text-sm font-medium text-ink">{ticket.name}</p>
            <p className="mt-0.5 font-mono text-[11px] text-subtle">#{shortId}</p>
          </div>
          <div
            className="h-11 w-11 shrink-0 opacity-90 [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: identicon }}
          />
        </div>
      </div>

      {/* Actions (client) + save reminder */}
      <TicketActions
        code={ticket.ticketCode}
        title={ticket.event.title}
        url={ticketUrl(ticket.ticketCode)}
      />

      <p className="px-2 text-center text-xs leading-relaxed text-subtle print:hidden">
        This link is your ticket — bookmark it or send it to yourself. You can
        always recover it at{" "}
        <Link href="/t/lookup" className="underline hover:text-ink">
          /t/lookup
        </Link>
        .
      </p>
    </main>
  );
}
