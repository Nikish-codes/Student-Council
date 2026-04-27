"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { Picture } from "@/components/ui/picture";
import { Badge } from "@/components/ui/badge";
import { shortDate } from "@/lib/utils";
import type { EventItem } from "@/lib/schemas";

/**
 * Horizontally-pinned editorial events rail.
 * Vertical scroll → horizontal panel translation, with a live counter.
 */
export function EventsRail({ events }: { events: EventItem[] }) {
  const root = React.useRef<HTMLElement>(null);
  const [active, setActive] = React.useState(0);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const track = root.current?.querySelector<HTMLElement>("[data-track]");
      const panels = root.current?.querySelectorAll<HTMLElement>("[data-panel]");
      const headline = root.current?.querySelector<HTMLElement>("[data-rail-headline]");

      if (headline) {
        const split = new SplitText(headline, { type: "chars,words", charsClass: "char" });
        gsap.set(headline, { opacity: 1 });
        if (!reduced) {
          gsap.set(split.chars, {
            opacity: 0,
            y: 60,
            rotateX: -60,
            filter: "blur(8px)",
          });
          gsap.to(split.chars, {
            opacity: 1,
            y: 0,
            rotateX: 0,
            filter: "blur(0px)",
            duration: 0.9,
            ease: "expo.out",
            stagger: { each: 0.025 },
            scrollTrigger: { trigger: headline, start: "top 85%", once: true },
          });
        }
      }

      if (!track || !panels?.length || reduced) return;

      const ctx = gsap.context(() => {
        // Total horizontal distance: width of track minus viewport.
        const getDistance = () => track.scrollWidth - window.innerWidth;

        const tween = gsap.to(track, {
          x: () => -getDistance(),
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${getDistance()}`,
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        // Per-panel parallax on banner
        panels.forEach((panel) => {
          const banner = panel.querySelector<HTMLElement>("[data-banner]");
          if (!banner) return;
          gsap.fromTo(
            banner,
            { xPercent: 8 },
            {
              xPercent: -8,
              ease: "none",
              scrollTrigger: {
                trigger: panel,
                containerAnimation: tween,
                start: "left right",
                end: "right left",
                scrub: true,
              },
            },
          );
        });

        // Active panel index — derive from ScrollTrigger progress (no reflow)
        let cachedCenters: number[] = [];
        const cacheCenters = () => {
          cachedCenters = Array.from(panels).map((p) => p.offsetLeft + p.offsetWidth / 2);
        };
        cacheCenters();

        ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: () => `+=${getDistance()}`,
          onUpdate: (self) => {
            const trackX = -getDistance() * self.progress;
            const viewportCenter = window.innerWidth / 2 - trackX;
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < cachedCenters.length; i++) {
              const d = Math.abs(cachedCenters[i] - viewportCenter);
              if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
              }
            }
            setActive(bestIdx);
          },
          onRefresh: cacheCenters,
        });
      }, root);

      return () => ctx.revert();
    },
    { scope: root, dependencies: [events.length] },
  );

  return (
    <section
      ref={root}
      aria-label="Upcoming events"
      className="relative overflow-hidden bg-bg"
    >
      {/* Sticky overlay HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="container flex items-end justify-between gap-8 pt-8 sm:pt-12">
          <div className="max-w-2xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-14 bg-line/30" aria-hidden />
              <span className="kicker">Upcoming · {events.length} on the calendar</span>
            </div>
            <h2
              data-rail-headline
              className="display text-balance text-4xl leading-[0.92] sm:text-6xl lg:text-7xl"
            >
              <span className="block">What&apos;s next</span>
              <span className="block italic text-muted">on campus.</span>
            </h2>
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
            <span className="font-mono text-xs text-subtle">Now showing</span>
            <span className="font-mono text-2xl tabular-nums text-ink">
              {String(active + 1).padStart(2, "0")} <span className="text-subtle">/ {String(events.length).padStart(2, "0")}</span>
            </span>
            <Link
              href="/events"
              className="kicker pointer-events-auto mt-2 inline-flex items-center gap-2 text-ink hover:text-muted"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* The pinned track */}
      <div className="relative h-[100svh] w-full">
        <div
          data-track
          className="absolute left-0 top-0 flex h-full items-center gap-8 px-[8vw] will-change-transform"
        >
          {events.map((e, i) => {
            const d = shortDate(e.date);
            return (
              <Link
                key={e.slug}
                href={`/events/${e.slug}`}
                data-panel
                className="group/p relative flex h-[78vh] w-[min(78vw,720px)] shrink-0 flex-col overflow-hidden rounded-3xl border border-line/15 bg-surface/40"
              >
                <div className="relative h-[55%] w-full overflow-hidden">
                  <div data-banner className="absolute inset-0 -mx-[8%] h-full w-[116%]">
                    <Picture
                      src={e.banner}
                      alt={e.title}
                      fill
                      fallbackLabel={e.category}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/p:scale-[1.04]"
                    />
                  </div>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent"
                  />
                  <div className="absolute left-6 top-6 flex items-center gap-2">
                    <Badge>{e.category}</Badge>
                  </div>
                  <span className="absolute right-6 top-6 font-mono text-xs text-subtle">
                    {String(i + 1).padStart(2, "0")} / {String(events.length).padStart(2, "0")}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-4 p-8">
                  <div className="flex items-baseline gap-3 font-mono text-ink">
                    <span className="display text-7xl leading-none italic">{d.day}</span>
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-widest text-muted">
                        {d.month} · {d.year}
                      </span>
                      <span className="text-[10px] tracking-widest text-subtle">
                        {new Date(e.date).toLocaleDateString("en-IN", { weekday: "long" })}
                      </span>
                    </div>
                  </div>
                  <h3 className="display text-balance text-3xl text-ink sm:text-4xl">
                    {e.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    <span>{e.venue}</span>
                  </div>
                  <p className="text-pretty text-sm text-muted line-clamp-2">{e.excerpt}</p>
                  <div className="mt-auto flex items-center justify-between border-t border-line/10 pt-5">
                    <span className="kicker">Read brief</span>
                    <ArrowRight className="h-4 w-4 text-ink transition-transform duration-300 group-hover/p:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}

          {/* End-of-rail slate */}
          <Link
            href="/events"
            data-panel
            className="group/end relative flex h-[78vh] w-[min(78vw,720px)] shrink-0 flex-col items-start justify-between gap-8 rounded-3xl border border-line/15 bg-ink/[0.02] p-10"
          >
            <span className="kicker text-subtle">End of the rail</span>
            <h3 className="display text-balance text-5xl leading-[0.95] sm:text-7xl">
              <span className="block">See the</span>
              <span className="block italic text-muted">whole calendar.</span>
            </h3>
            <span className="inline-flex items-center gap-3 text-ink">
              All events
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover/end:translate-x-1" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
