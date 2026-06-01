"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { gsap, prefersSimpleTextMotion, SplitText, useGSAP } from "@/lib/gsap";
import { Marquee } from "@/components/motion/marquee";
import { Picture } from "@/components/ui/picture";
import { cn } from "@/lib/utils";
import type { Club } from "@/lib/schemas";

/**
 * Featured club spotlight + logo rail.
 *
 * The old wall rendered every logo as a large tile, then stagger-animated all
 * tiles on scroll. This version keeps the "many communities" feeling but does
 * it with a lightweight logo rail and one contextual spotlight card.
 */
export function ClubsLogoWall({ clubs }: { clubs: Club[] }) {
  const root = React.useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const activeClub = clubs[activeIndex] ?? clubs[0];
  const railClubs = clubs.length > 0 ? clubs : [];

  // Headline entrance animation only. The rail itself uses one CSS transform.
  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduced) return;

      const headline = root.current?.querySelector<HTMLElement>(
        "[data-clubs-headline]",
      );
      if (!headline) return;

      gsap.set(headline, { opacity: 1 });
      if (prefersSimpleTextMotion()) {
        gsap.from(headline, {
          opacity: 0,
          y: 24,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: { trigger: headline, start: "top 85%", once: true },
        });
        return;
      }

      const split = new SplitText(headline, {
        type: "chars,words",
        charsClass: "char",
      });
      gsap.set(split.chars, {
        opacity: 0,
        y: 100,
        rotateX: -70,
        filter: "blur(10px)",
      });
      gsap.to(split.chars, {
        opacity: 1,
        y: 0,
        rotateX: 0,
        filter: "blur(0px)",
        duration: 1,
        ease: "expo.out",
        stagger: { each: 0.022 },
        scrollTrigger: { trigger: headline, start: "top 85%", once: true },
      });
    },
    { scope: root },
  );

  // Auto-rotate the spotlight so the rail isn't just decorative. It pauses
  // when the user hovers/focuses the section and respects reduced motion.
  React.useEffect(() => {
    if (prefersReducedMotion || paused || clubs.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % clubs.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [clubs.length, paused, prefersReducedMotion]);

  const goToPrevious = () => {
    if (clubs.length <= 1) return;
    setActiveIndex((current) => (current - 1 + clubs.length) % clubs.length);
  };

  const goToNext = () => {
    if (clubs.length <= 1) return;
    setActiveIndex((current) => (current + 1) % clubs.length);
  };

  if (!activeClub) return null;

  return (
    <section
      ref={root}
      aria-label="Student clubs spotlight"
      className="relative overflow-hidden border-t border-line/10 bg-bg py-28 sm:py-40"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_80%_75%,rgba(255,255,255,0.05),transparent_30%)]" />

      <div className="container relative z-10">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-14 bg-line/30" aria-hidden />
              <span className="kicker">
                {clubs.length} communities · one council
              </span>
            </div>
            <h2
              data-clubs-headline
              className="display text-balance text-5xl leading-[0.92] sm:text-7xl lg:text-8xl"
              style={{ perspective: "800px" }}
            >
              <span className="block">Find your</span>
              <span className="block italic text-muted">people.</span>
            </h2>
          </div>
          <Link
            href="/clubs"
            className="group/all inline-flex items-center gap-3 self-start text-sm text-ink sm:self-end"
          >
            <span className="kicker">Explore all clubs</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/all:translate-x-1" />
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] lg:items-stretch">
          <SpotlightCard
            club={activeClub}
            index={activeIndex}
            total={clubs.length}
            onPrevious={goToPrevious}
            onNext={goToNext}
          />

          <div className="relative overflow-hidden border border-line/10 bg-surface/20 p-5 sm:p-6 lg:min-h-[25rem]">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="kicker mb-3 text-subtle">Live club rail</p>
                <p className="max-w-md text-sm leading-relaxed text-muted">
                  Hover or tap a logo to spotlight it. The rail keeps campus
                  moving without loading the homepage like a giant logo wall.
                </p>
              </div>
              <span className="hidden rounded-full border border-line/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle sm:inline-flex">
                {paused ? "Paused" : "Rolling"}
              </span>
            </div>

            <div className="relative -mx-5 flex flex-col gap-4 sm:-mx-6">
              <Marquee speed={Math.max(36, clubs.length * 2.4)} pauseOnHover>
                {railClubs.map((club, index) => (
                  <RailLogo
                    key={club.slug}
                    club={club}
                    active={index === activeIndex}
                    onSelect={() => setActiveIndex(index)}
                  />
                ))}
              </Marquee>
              <Marquee
                speed={Math.max(42, clubs.length * 2.8)}
                pauseOnHover
                reverse
              >
                {[...railClubs].reverse().map((club) => {
                  const originalIndex = clubs.findIndex(
                    (item) => item.slug === club.slug,
                  );
                  return (
                    <RailLogo
                      key={club.slug}
                      club={club}
                      active={originalIndex === activeIndex}
                      compact
                      onSelect={() => setActiveIndex(originalIndex)}
                    />
                  );
                })}
              </Marquee>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-line/10 pt-5 text-center">
              <MiniStat value={clubs.length} label="Clubs" />
              <MiniStat value={uniqueTagCount(clubs)} label="Tags" />
              <MiniStat
                value={
                  clubs.reduce((sum, club) => sum + (club.members ?? 0), 0) ||
                  "—"
                }
                label="Members"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SpotlightCard({
  club,
  index,
  total,
  onPrevious,
  onNext,
}: {
  club: Club;
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <article className="relative overflow-hidden border border-line/10 bg-surface/35 p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-ink/5 blur-3xl" />
      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-8 flex items-center justify-between gap-4">
          <span className="kicker text-subtle">Featured club</span>
          <span className="font-mono text-xs text-muted">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(total).padStart(2, "0")}
          </span>
        </div>

        <div className="mb-8 flex items-center gap-5">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center border border-line/12 bg-bg/60 p-5 sm:h-32 sm:w-32">
            <Picture
              src={club.logo}
              alt={club.name}
              fill
              sizes="128px"
              quality={70}
              fallbackLabel={club.name.slice(0, 2).toUpperCase()}
              className="object-contain p-5"
            />
          </div>
          <div className="min-w-0">
            <h3 className="display mb-3 text-balance text-3xl leading-none text-ink sm:text-4xl">
              {club.name}
            </h3>
            {club.members ? (
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-subtle">
                {club.members}+ active members
              </p>
            ) : null}
          </div>
        </div>

        <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          {club.blurb}
        </p>

        {club.tags.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {club.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-line/10 bg-bg/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-10">
          <Link
            href="/clubs"
            className="group/spot inline-flex items-center gap-3 text-sm text-ink"
          >
            <span className="kicker">View club directory</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/spot:translate-x-1" />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevious}
              className="grid h-10 w-10 place-items-center rounded-full border border-line/12 bg-bg/40 text-ink transition-colors hover:border-line/35 hover:bg-surface/60"
              aria-label="Previous club"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              className="grid h-10 w-10 place-items-center rounded-full border border-line/12 bg-bg/40 text-ink transition-colors hover:border-line/35 hover:bg-surface/60"
              aria-label="Next club"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function RailLogo({
  club,
  active,
  compact,
  onSelect,
}: {
  club: Club;
  active: boolean;
  compact?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Spotlight ${club.name}`}
      className={cn(
        "group/rail relative flex shrink-0 items-center justify-center overflow-hidden border bg-bg/45 transition-colors duration-200 hover:border-line/40 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/50",
        active ? "border-ink/50" : "border-line/12",
        compact
          ? "h-20 w-32 px-5 sm:h-24 sm:w-40"
          : "h-24 w-40 px-6 sm:h-28 sm:w-48",
      )}
    >
      <div className="relative h-14 w-full sm:h-16">
        <Picture
          src={club.logo}
          alt=""
          fill
          sizes={compact ? "160px" : "192px"}
          quality={60}
          fallbackLabel={club.name.slice(0, 2).toUpperCase()}
          className="object-contain"
        />
      </div>
      <span className="pointer-events-none absolute inset-x-2 bottom-2 truncate text-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100 group-focus-visible/rail:opacity-100">
        {club.name}
      </span>
    </button>
  );
}

function MiniStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div className="display text-2xl text-ink sm:text-3xl">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
        {label}
      </div>
    </div>
  );
}

function uniqueTagCount(clubs: Club[]) {
  return new Set(clubs.flatMap((club) => club.tags)).size;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);

    const listener = () => setReduced(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return reduced;
}
