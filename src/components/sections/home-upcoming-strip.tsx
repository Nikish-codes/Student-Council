"use client";

import * as React from "react";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/gsap";
import { getEventTiming } from "@/lib/event-status";
import type { EventItem } from "@/lib/schemas";

interface HomeUpcomingStripProps {
  events: EventItem[];
  totalCount: number;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    mon: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    weekday: d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase(),
  };
}

function relativeDays(event: EventItem) {
  const now = Date.now();
  if (getEventTiming(event, now).isLive) {
    return { label: "ONGOING", urgent: true };
  }
  const diff = +new Date(event.date) - now;
  const days = Math.round(diff / 86_400_000);
  if (days <= 0) return { label: "TODAY", urgent: true };
  if (days === 1) return { label: "TOMORROW", urgent: true };
  if (days < 7) return { label: `IN ${days} DAYS`, urgent: true };
  if (days < 30)
    return { label: `IN ${Math.round(days / 7)} WEEKS`, urgent: false };
  return { label: `IN ${Math.round(days / 30)} MONTHS`, urgent: false };
}

export function HomeUpcomingStrip({
  events,
  totalCount,
}: HomeUpcomingStripProps) {
  const root = React.useRef<HTMLElement>(null);
  const visible = events.slice(0, 3);

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduced) return;
      const ctx = gsap.context(() => {
        const items =
          root.current?.querySelectorAll<HTMLElement>("[data-strip-item]");
        const head =
          root.current?.querySelectorAll<HTMLElement>("[data-strip-head]");
        if (head) {
          gsap.set(head, { opacity: 1 });
          gsap.from(head, {
            opacity: 0,
            y: 16,
            stagger: 0.06,
            duration: 0.6,
            scrollTrigger: { trigger: root.current, start: "top 85%" },
          });
        }
        if (items) {
          gsap.from(items, {
            opacity: 0,
            y: 24,
            stagger: 0.08,
            duration: 0.7,
            scrollTrigger: { trigger: root.current, start: "top 80%" },
          });
        }
      }, root);
      return () => ctx.revert();
    },
    { scope: root },
  );

  if (!visible.length) return null;

  return (
    <section
      ref={root}
      className="relative bg-bg border-y border-line/8"
      aria-label="Upcoming events at a glance"
    >
      <div className="mx-auto max-w-[1720px] px-6 py-10 lg:py-14">
        {/* Header row */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <span
              data-strip-head
              className="kicker text-ink flex items-center gap-2"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Next up · Upcoming
            </span>
            <span data-strip-head className="kicker text-subtle">
              {String(totalCount).padStart(2, "0")} on the calendar
            </span>
          </div>
          <Link
            data-strip-head
            href="/events"
            className="prose-link text-sm font-mono uppercase tracking-[0.2em] text-muted hover:text-ink transition-colors"
          >
            All events →
          </Link>
        </div>

        {/* Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line/8 border-y border-line/8">
          {visible.map((e) => {
            const { day, mon, weekday } = fmtDate(e.date);
            const rel = relativeDays(e);
            return (
              <Link
                key={e.slug}
                data-strip-item
                href={`/events/${e.slug}`}
                className="group relative flex items-stretch gap-5 py-5 px-4 md:px-6 hover:bg-surface/40 transition-colors"
              >
                {/* Date block */}
                <div className="shrink-0 flex flex-col items-start font-mono leading-none">
                  <span className="text-[0.6875rem] text-subtle tracking-[0.22em]">
                    {weekday}
                  </span>
                  <span
                    className="display italic text-ink mt-1"
                    style={{ fontSize: "clamp(2.2rem, 4vw, 3rem)" }}
                  >
                    {day}
                  </span>
                  <span className="text-[0.6875rem] text-muted tracking-[0.22em] mt-1">
                    {mon}
                  </span>
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="kicker text-subtle mb-1.5">
                    {e.category} ·{" "}
                    <span
                      className={rel.urgent ? "text-accent font-semibold" : ""}
                    >
                      {rel.label}
                    </span>
                  </div>
                  <div
                    className="text-ink font-medium leading-tight line-clamp-2 group-hover:underline decoration-ink/40 underline-offset-4"
                    style={{ fontSize: "clamp(1rem, 1.4vw, 1.15rem)" }}
                  >
                    {e.title}
                  </div>
                  <div className="mt-auto pt-3 flex items-center justify-between text-[0.6875rem] font-mono uppercase tracking-[0.22em] text-subtle">
                    <span className="truncate">@ {e.venue}</span>
                    <span className="text-ink opacity-0 group-hover:opacity-100 transition-opacity ml-3 shrink-0">
                      Open →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
