"use client";

import * as React from "react";
import Link from "next/link";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { EventItem } from "@/lib/schemas";

interface ArchiveCanvasProps {
  events: EventItem[];
}

const CAT_ACCENT: Record<string, string> = {
  Bootcamp: "#7dd3fc",
  Hackathon: "#f0abfc",
  Cultural: "#fde68a",
  Sports: "#86efac",
  Workshop: "#fca5a5",
  Talk: "#c4b5fd",
  Drive: "#fbbf24",
};

function ymd(iso: string) {
  const d = new Date(iso);
  return {
    year: d.getFullYear(),
    monthIdx: d.getMonth(),
    monthShort: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    weekday: d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase(),
    full: d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  };
}

interface YearBucket {
  year: number;
  count: number;
  events: EventItem[];
}

function bucketByYear(events: EventItem[]): YearBucket[] {
  const map = new Map<number, EventItem[]>();
  for (const e of events) {
    const y = new Date(e.date).getFullYear();
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(e);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, evs]) => ({ year, count: evs.length, events: evs }));
}

export function ArchiveCanvas({ events }: ArchiveCanvasProps) {
  const root = React.useRef<HTMLElement>(null);
  const buckets = React.useMemo(() => bucketByYear(events), [events]);
  const allYears = buckets.map((b) => b.year);
  const [activeYear, setActiveYear] = React.useState<number | "all">("all");
  const [activeCat, setActiveCat] = React.useState<string | "all">("all");

  const allCats = React.useMemo(() => {
    return Array.from(new Set(events.map((e) => e.category))).sort();
  }, [events]);

  const filteredBuckets = React.useMemo(() => {
    return buckets
      .filter((b) => activeYear === "all" || b.year === activeYear)
      .map((b) => ({
        ...b,
        events: b.events.filter((e) => activeCat === "all" || e.category === activeCat),
      }))
      .filter((b) => b.events.length > 0);
  }, [buckets, activeYear, activeCat]);

  const totalShown = filteredBuckets.reduce((acc, b) => acc + b.events.length, 0);
  const dateRange = React.useMemo(() => {
    if (events.length === 0) return null;
    const sorted = [...events].sort((a, b) => +new Date(a.date) - +new Date(b.date));
    const first = new Date(sorted[0].date);
    const last = new Date(sorted[sorted.length - 1].date);
    return {
      from: first.toLocaleDateString("en-GB", { month: "short", year: "numeric" }).toUpperCase(),
      to: last.toLocaleDateString("en-GB", { month: "short", year: "numeric" }).toUpperCase(),
    };
  }, [events]);

  // Headline + meta intro
  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const ctx = gsap.context(() => {
        const headline = root.current?.querySelector<HTMLElement>("[data-archive-headline]");
        if (headline) {
          gsap.set(headline, { opacity: 1 });
          if (!reduced) {
            const split = new SplitText(headline, { type: "chars" });
            gsap.from(split.chars, {
              opacity: 0,
              y: 80,
              rotateX: -50,
              filter: "blur(8px)",
              duration: 1.1,
              stagger: 0.025,
              ease: "power3.out",
            });
          }
        }
        const meta = root.current?.querySelectorAll<HTMLElement>("[data-archive-bit]");
        if (meta) {
          gsap.set(meta, { opacity: 1 });
          if (!reduced) {
            gsap.from(meta, { opacity: 0, y: 16, stagger: 0.06, duration: 0.6, delay: 0.4 });
          }
        }
      }, root);
      return () => ctx.revert();
    },
    { scope: root },
  );

  // Animate event rows on filter change
  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;
      const ctx = gsap.context(() => {
        const rows = root.current?.querySelectorAll<HTMLElement>("[data-archive-row]");
        if (rows) {
          gsap.fromTo(
            rows,
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, stagger: 0.025, duration: 0.55, ease: "power2.out" },
          );
        }
      }, root);
      return () => ctx.revert();
    },
    { scope: root, dependencies: [activeYear, activeCat] },
  );

  return (
    <section ref={root} className="relative bg-bg">
      {/* Hero band */}
      <div className="border-b border-line/8">
        <div className="mx-auto max-w-[1720px] px-6 lg:px-10 pt-24 pb-16 lg:pt-32 lg:pb-20">
          <div data-archive-bit className="kicker mb-8 flex items-center gap-3 text-ink">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink" />
            The Archive · Past Sessions
          </div>
          <h1
            data-archive-headline
            className="display text-ink leading-[0.85] mb-10"
            style={{ fontSize: "clamp(4rem, 14vw, 14rem)" }}
          >
            Archive
            <span className="italic text-muted">.</span>
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 border-t border-line/8 pt-8">
            <div data-archive-bit>
              <div className="kicker text-subtle mb-2">Total events</div>
              <div className="display italic text-ink leading-none" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
                {String(events.length).padStart(2, "0")}
              </div>
            </div>
            <div data-archive-bit>
              <div className="kicker text-subtle mb-2">Years on record</div>
              <div className="display italic text-ink leading-none" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
                {String(allYears.length).padStart(2, "0")}
              </div>
            </div>
            <div data-archive-bit>
              <div className="kicker text-subtle mb-2">Spanning</div>
              <div className="text-ink font-mono text-base sm:text-lg">
                {dateRange ? `${dateRange.from} → ${dateRange.to}` : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar (sticky) */}
      <div className="sticky top-0 z-30 border-b border-line/8 bg-bg/85 backdrop-blur">
        <div className="mx-auto max-w-[1720px] px-6 lg:px-10 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <span className="kicker text-subtle shrink-0">Filter ::</span>

          <div className="flex flex-wrap items-center gap-1.5">
            <FilterPill
              active={activeYear === "all"}
              onClick={() => setActiveYear("all")}
              label="All years"
            />
            {allYears.map((y) => (
              <FilterPill
                key={y}
                active={activeYear === y}
                onClick={() => setActiveYear(y)}
                label={String(y)}
              />
            ))}
          </div>

          <div className="hidden sm:block h-4 w-px bg-line/15" />

          <div className="flex flex-wrap items-center gap-1.5">
            <FilterPill
              active={activeCat === "all"}
              onClick={() => setActiveCat("all")}
              label="All categories"
            />
            {allCats.map((c) => (
              <FilterPill
                key={c}
                active={activeCat === c}
                onClick={() => setActiveCat(c)}
                label={c}
                accent={CAT_ACCENT[c]}
              />
            ))}
          </div>

          <span className="ml-auto kicker text-subtle">
            <span className="text-ink">{String(totalShown).padStart(2, "0")}</span> shown
          </span>
        </div>
      </div>

      {/* Year sections */}
      {filteredBuckets.length === 0 ? (
        <div className="mx-auto max-w-[1720px] px-6 lg:px-10 py-32 text-center">
          <div className="kicker text-subtle mb-4">No matches</div>
          <p className="text-muted text-lg">
            Nothing in the archive matches that combination yet.
          </p>
        </div>
      ) : (
        filteredBuckets.map((bucket) => (
          <div
            key={bucket.year}
            className="border-b border-line/8 last:border-b-0"
          >
            {/* Year header */}
            <div className="mx-auto max-w-[1720px] px-6 lg:px-10 pt-16 pb-6 lg:pt-24 lg:pb-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-9">
                <div className="kicker text-subtle mb-3">Session</div>
                <div
                  className="display italic text-ink leading-none"
                  style={{ fontSize: "clamp(4rem, 11vw, 9rem)" }}
                >
                  {bucket.year}
                </div>
              </div>
              <div className="lg:col-span-3 lg:text-right font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-subtle">
                <span className="text-ink">{String(bucket.events.length).padStart(2, "0")}</span> events filed
              </div>
            </div>

            {/* Event rows */}
            <ul className="mx-auto max-w-[1720px] px-6 lg:px-10 pb-16 lg:pb-24">
              {bucket.events.map((e) => {
                const d = ymd(e.date);
                const accent = CAT_ACCENT[e.category] ?? "#a3a3a3";
                return (
                  <li
                    key={e.slug}
                    data-archive-row
                    className="group border-t border-line/8 last:border-b last:border-line/8"
                  >
                    <Link
                      href={`/events/${e.slug}`}
                      className="grid grid-cols-12 items-center gap-4 sm:gap-6 py-5 sm:py-7 transition-colors hover:bg-surface/40"
                    >
                      {/* Day numeral */}
                      <div className="col-span-2 sm:col-span-1 flex flex-col items-start font-mono leading-none">
                        <span
                          className="display italic text-ink"
                          style={{ fontSize: "clamp(1.6rem, 2.5vw, 2.25rem)" }}
                        >
                          {d.day}
                        </span>
                        <span className="text-[0.625rem] text-subtle tracking-[0.22em] mt-1.5">
                          {d.monthShort}
                        </span>
                      </div>

                      {/* Category dot + label */}
                      <div className="col-span-4 sm:col-span-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ background: accent }}
                          />
                          <span className="kicker text-muted truncate">{e.category}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="col-span-12 sm:col-span-6 order-last sm:order-none mt-2 sm:mt-0">
                        <div
                          className={cn(
                            "text-ink leading-tight font-medium",
                            "group-hover:underline decoration-ink/40 underline-offset-4",
                          )}
                          style={{ fontSize: "clamp(1.05rem, 1.5vw, 1.35rem)" }}
                        >
                          {e.title}
                        </div>
                      </div>

                      {/* Venue + arrow */}
                      <div className="col-span-6 sm:col-span-3 flex items-center justify-end gap-3 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-subtle">
                        <span className="truncate max-w-[14ch] sm:max-w-none text-right">
                          @ {e.venue}
                        </span>
                        <span className="text-ink opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          Open →
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}

      {/* Outro */}
      <div className="border-t border-line/8 bg-bg">
        <div className="mx-auto max-w-[1720px] px-6 lg:px-10 py-16 lg:py-24 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
          <div>
            <div className="kicker mb-4 text-muted">End of archive</div>
            <p className="text-ink text-xl sm:text-2xl max-w-2xl leading-snug">
              Every event we shipped, on the record. The next entry is always in production.
            </p>
          </div>
          <Link
            href="/events"
            className="inline-flex items-center gap-3 text-sm font-mono uppercase tracking-[0.2em] text-ink border-b border-ink/40 pb-1 hover:border-ink transition-colors self-start sm:self-auto"
          >
            See what&apos;s next
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function FilterPill({
  label,
  active,
  onClick,
  accent,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.18em] transition-colors",
        active
          ? "border-ink bg-ink text-bg"
          : "border-line/15 text-muted hover:border-ink/40 hover:text-ink",
      )}
    >
      {accent && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: active ? "#0a0a0a" : accent }}
        />
      )}
      {label}
    </button>
  );
}
