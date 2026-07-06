"use client";

import { CalendarPlus, Download, Share2, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";

type Props = { code: string; title: string; url: string };

export function TicketActions({ code, title, url }: Props) {
  const shareText = `My ticket for ${title}: ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ticket link copied");
    } catch {
      toast.error("Couldn't copy — long-press the link instead");
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Ticket · ${title}`, text: shareText, url });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  }

  const btn =
    "flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-line/15 bg-surface px-2 py-3 text-xs font-medium text-ink transition-colors hover:border-line/40 hover:bg-line/5";

  return (
    <div className="grid grid-cols-4 gap-2 print:hidden">
      {/* Free "send to my WhatsApp": opens the user's own WhatsApp with the
          ticket link pre-filled — no API, no cost. */}
      <a
        className={btn}
        href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle className="h-5 w-5 text-accent" />
        WhatsApp
      </a>
      <a className={btn} href={`/api/tickets/ics/${encodeURIComponent(code)}`}>
        <CalendarPlus className="h-5 w-5" />
        Calendar
      </a>
      <button type="button" className={btn} onClick={() => window.print()}>
        <Download className="h-5 w-5" />
        Save PDF
      </button>
      <button type="button" className={btn} onClick={nativeShare}>
        <Share2 className="h-5 w-5" />
        Share
      </button>
      <button
        type="button"
        className={`${btn} col-span-4 flex-row`}
        onClick={copy}
      >
        <Copy className="h-4 w-4" />
        Copy ticket link
      </button>
    </div>
  );
}
