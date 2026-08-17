"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Picture } from "@/components/ui/picture";
import { gsap, prefersSimpleTextMotion, SplitText, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { EventItem } from "@/lib/schemas";

const KICKERS = ["What's on", "What's next", "What's live", "What's new"];

export function EventsOverture({
  liveCount,
  upcomingCount,
  pastCount,
  featured,
}: {
  liveCount: number;
  upcomingCount: number;
  pastCount: number;
  featured?: EventItem;
}) {
  const root = React.useRef<HTMLDivElement>(null);
  const [k, setK] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setK((i) => (i + 1) % KICKERS.length), 2400);
    return () => clearInterval(id);
  }, []);

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const simpleText = prefersSimpleTextMotion();
      const ctx = gsap.context(() => {
        root.current
          ?.querySelectorAll<HTMLElement>("[data-split]")
          .forEach((el) => {
            gsap.set(el, { opacity: 1 });
            if (reduced) return;
            if (simpleText) {
              gsap.from(el, {
                opacity: 0,
                y: 24,
                duration: 0.7,
                ease: "power2.out",
              });
              return;
            }
            const split = new SplitText(el, {
              type: "chars,words",
              charsClass: "char",
            });
            gsap.set(split.chars, { opacity: 0, y: 80, rotateX: -70 });
            gsap.to(split.chars, {
              opacity: 1,
              y: 0,
              rotateX: 0,
              duration: 1,
              ease: "expo.out",
              stagger: { each: 0.022 },
            });
          });

        const meta = root.current?.querySelectorAll<HTMLElement>(
          "[data-meta-row] > *",
        );
        if (meta?.length) {
          gsap.set(meta, { opacity: 1 });
          if (!reduced) {
            gsap.from(meta, {
              y: 30,
              opacity: 0,
              duration: 0.9,
              ease: "expo.out",
              stagger: 0.08,
              delay: 0.4,
            });
          }
        }

        // Featured banner reveal
        const featBanner =
          root.current?.querySelector<HTMLElement>("[data-feat-banner]");
        const featBits =
          root.current?.querySelectorAll<HTMLElement>("[data-feat-bit]");
        if (featBanner && !reduced) {
          gsap.from(featBanner, {
            opacity: 0,
            scale: 1.05,
            duration: 1.4,
            ease: "expo.out",
            scrollTrigger: {
              trigger: featBanner,
              start: "top 80%",
              once: true,
            },
          });
        }
        if (featBits?.length) {
          gsap.set(featBits, { opacity: 1 });
          if (!reduced) {
            gsap.from(featBits, {
              y: 30,
              opacity: 0,
              duration: 0.9,
              ease: "expo.out",
              stagger: 0.08,
              scrollTrigger: {
                trigger: featBits[0],
                start: "top 80%",
                once: true,
              },
            });
          }
        }
      }, root);
      return () => ctx.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      {/* ─── HERO ─── */}
      <section className="container pt-32 sm:pt-40">
        <div className="max-w-5xl">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-px w-14 bg-line/30" aria-hidden />
            <span className="kicker relative inline-flex h-4 min-w-[7rem] overflow-hidden">
              {KICKERS.map((label, i) => (
                <span
                  key={label}
                  className={cn(
                    "absolute left-0 top-0 transition-all duration-500 ease-out",
                    i === k
                      ? "translate-y-0 opacity-100"
                      : i === (k - 1 + KICKERS.length) % KICKERS.length
                        ? "-translate-y-full opacity-0"
                        : "translate-y-full opacity-0",
                  )}
                >
                  {label}
                </span>
              ))}
            </span>
          </div>
          <h1
            data-split
            className="display text-balance text-7xl leading-[0.9] sm:text-8xl lg:text-[11rem]"
          >
            Events.
          </h1>
          <p className="mt-10 max-w-2xl text-balance text-lg text-muted">
            From flagship hackathons to monthly open mics — every event the
            Council is running this year, on one calendar.
          </p>

          {/* Live count strip — mirrors the Now / Upcoming / Past tabs */}
          <div
            data-meta-row
            className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line/10 bg-line/[0.03] sm:grid-cols-3"
          >
            <Stat
              label="Happening now"
              value={pad(liveCount)}
              suffix={liveCount === 1 ? "live event" : "live events"}
            />
            <Stat
              label="Upcoming"
              value={pad(upcomingCount)}
              suffix={upcomingCount === 1 ? "event" : "events"}
            />
            <Stat
              label="Past"
              value={pad(pastCount)}
              suffix="in the archive"
            />
          </div>
        </div>
      </section>

      {/* ─── FEATURED BANNER ─── */}
      {featured && (
        <section className="container mt-24 sm:mt-32">
          <Link
            href={`/events/${featured.slug}`}
            data-feat-banner
            className="group/feat relative block aspect-[16/9] w-full overflow-hidden rounded-3xl border border-line/15 bg-surface/40 sm:aspect-[21/9]"
          >
            <Picture
              src={featured.banner}
              alt={featured.title}
              fill
              fallbackLabel={featured.category}
              className="opacity-50 transition-all duration-700 ease-out group-hover/feat:scale-[1.04] group-hover/feat:opacity-70"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-bg/50 via-bg/15 to-transparent"
            />
            <div className="relative flex h-full flex-col justify-between p-8 sm:p-12 lg:p-16">
              <div data-feat-bit className="flex items-center gap-3">
                <span
                  className="inline-flex h-2 w-2 rounded-full bg-ink"
                  aria-hidden
                  style={{ boxShadow: "0 0 16px rgb(255 255 255 / 0.8)" }}
                />
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink">
                  Spotlight · Council pick
                </span>
              </div>
              <div className="space-y-6">
                <div data-feat-bit className="kicker text-ink/80">
                  {featured.category}
                </div>
                <h2
                  data-feat-bit
                  className="display text-balance text-4xl leading-[0.95] text-ink sm:text-6xl lg:text-7xl"
                >
                  {featured.title}
                </h2>
                <p
                  data-feat-bit
                  className="max-w-xl text-pretty text-base text-ink/80 sm:text-lg"
                >
                  {featured.excerpt}
                </p>
                <div
                  data-feat-bit
                  className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-4 font-mono text-xs uppercase tracking-[0.18em] text-muted"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-px w-6 bg-line/40" aria-hidden />
                    {longDate(featured.date)}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />{" "}
                    {featured.venue}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-2 text-ink transition-transform duration-500 group-hover/feat:translate-x-1">
                    Read brief <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  truncate = false,
}: {
  label: string;
  value: string;
  suffix: string;
  truncate?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 bg-bg p-6 sm:p-7">
      <span className="kicker">{label}</span>
      <div className="flex items-baseline gap-3">
        <span className="display text-4xl tabular-nums text-ink sm:text-5xl">
          {value}
        </span>
        <span
          className={cn(
            "text-xs uppercase tracking-[0.18em] text-muted",
            truncate && "truncate",
          )}
        >
          {suffix}
        </span>
      </div>
    </div>
  );
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function longDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
