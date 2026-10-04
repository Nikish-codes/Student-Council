"use client";

import { useState } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { Maximize2, ExternalLink, Download, X } from "lucide-react";

interface SportsCalendarViewerProps {
  imageUrl: string;
  title?: string;
  description?: string;
}

export function SportsCalendarViewer({
  imageUrl,
  title,
  description,
}: SportsCalendarViewerProps) {
  const [open, setOpen] = useState(false);
  const displayTitle = title?.trim() || "Sports Calendar Schedule";
  const displayDescription =
    description?.trim() ||
    "Official schedule and dates for tournaments, leagues, and sports events.";

  return (
    <section aria-labelledby="calendar-schedule-heading" className="mb-16">
      <div className="mb-6 flex flex-col gap-4 border-b border-line/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="kicker text-accent">Annual Schedule</span>
          <h2
            id="calendar-schedule-heading"
            className="display mt-2 text-3xl sm:text-4xl text-ink"
          >
            {displayTitle}
          </h2>
          {displayDescription ? (
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted">
              {displayDescription}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line/20 bg-surface px-4 py-2 font-mono text-xs uppercase tracking-wider text-ink transition-colors hover:border-line/40 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Full screen</span>
          </button>
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line/20 bg-surface px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:border-line/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open raw ↗</span>
          </a>
          <a
            href={imageUrl}
            download="woxsen-sports-calendar"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line/20 bg-surface px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:border-line/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {/* Main interactive poster container */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-label="Click to zoom in on calendar schedule"
        className="group relative flex min-h-[380px] w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-2xl border border-line/15 bg-surface/30 p-2 sm:min-h-[520px] sm:p-4 transition-all duration-300 hover:border-line/30 hover:bg-surface/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {/* Ambient blurred backdrop glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="100vw"
            className="scale-110 object-cover opacity-20 blur-2xl"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-bg/40" />
        </div>

        {/* Foreground crystal-clear schedule graphic */}
        <div className="relative h-[400px] w-full sm:h-[600px] lg:h-[720px]">
          <Image
            src={imageUrl}
            alt={displayTitle}
            fill
            sizes="(min-width: 1280px) 1200px, 100vw"
            className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.01]"
            priority
          />
        </div>

        {/* Floating zoom badge */}
        <div className="absolute bottom-4 right-4 pointer-events-none inline-flex items-center gap-2 rounded-full border border-line/20 bg-bg/90 px-3.5 py-1.5 backdrop-blur-md shadow-lg text-xs font-mono text-muted transition-transform group-hover:scale-105 group-hover:text-ink">
          <Maximize2 className="h-3.5 w-3.5 text-accent" />
          <span>Click to zoom schedule</span>
        </div>
      </div>

      {/* Full screen modal dialog */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-bg/90 backdrop-blur-md animate-fade-in" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-2 sm:inset-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-line/20 bg-surface p-4 sm:p-6 shadow-2xl focus:outline-none"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-line/10 pb-4">
              <div>
                <Dialog.Title className="display text-lg sm:text-xl text-ink">
                  {displayTitle}
                </Dialog.Title>
                <p className="text-xs text-muted">
                  Use scroll or pinch to inspect fixtures
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-line/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-muted hover:text-ink"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Full image ↗</span>
                </a>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close calendar modal"
                    className="grid h-9 w-9 place-items-center rounded-lg border border-line/20 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            <div className="relative mt-4 flex-1 overflow-auto flex items-center justify-center rounded-xl bg-bg/60 p-2 sm:p-4">
              <div className="relative h-full w-full min-h-[300px]">
                <Image
                  src={imageUrl}
                  alt={displayTitle}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
