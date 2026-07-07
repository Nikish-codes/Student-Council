"use client";

import * as React from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { ClubCard } from "@/components/sections/club-card";
import { CountUp } from "@/components/motion/count-up";
import { cn } from "@/lib/utils";
import type { Club } from "@/lib/schemas";

// Primary category derived from the first tag bucket.
const CATEGORY_BUCKETS: { key: string; label: string; matchTags: string[] }[] = [
  { key: "tech", label: "Tech & Engineering", matchTags: ["Tech"] },
  { key: "business", label: "Business & Strategy", matchTags: ["Business"] },
  { key: "creative", label: "Creative & Design", matchTags: ["Creative"] },
  { key: "cultural", label: "Cultural & Performing", matchTags: ["Cultural"] },
  { key: "impact", label: "Impact & Service", matchTags: ["Impact"] },
  { key: "academic", label: "Academic & Research", matchTags: ["Academic"] },
];

function bucketOf(club: Club) {
  for (const b of CATEGORY_BUCKETS) {
    if (club.tags.some((t) => b.matchTags.includes(t))) return b.key;
  }
  return "other";
}

export function ClubsExplorer({ clubs }: { clubs: Club[] }) {
  const root = React.useRef<HTMLDivElement>(null);

  const grouped = React.useMemo(() => {
    return CATEGORY_BUCKETS.map((b) => ({
      ...b,
      items: clubs.filter((c) => bucketOf(c) === b.key),
    })).filter((g) => g.items.length > 0);
  }, [clubs]);

  const totalMembers = clubs.reduce((acc, c) => acc + (c.members ?? 0), 0);

  // Deliberately light entrances: this page animates WHILE the user scrolls,
  // so everything here is a single short fade-up per element group — no
  // split-char headers, no random fly-ins, no secondary logo tweens. Each of
  // those multiplied "layers animating at once" by 10-20× and made fast
  // scrolling stutter on laptops.
  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const ctx = gsap.context(() => {
        // ── Section headers: one fade-rise per title ──
        root.current?.querySelectorAll<HTMLElement>("[data-group-title]").forEach((el) => {
          gsap.set(el, { opacity: 1 });
          if (reduced) return;
          gsap.from(el, {
            opacity: 0,
            y: 32,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
        });

        // ── Group meta lines ──
        root.current?.querySelectorAll<HTMLElement>("[data-group-meta]").forEach((el) => {
          gsap.set(el, { opacity: 1 });
          if (reduced) return;
          gsap.from(el, {
            opacity: 0,
            x: -20,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        // ── Cards: single staggered fade-up per grid ──
        root.current?.querySelectorAll<HTMLElement>("[data-group-grid]").forEach((grid) => {
          const cards = grid.querySelectorAll("[data-club-card]");
          if (!cards.length) return;
          if (reduced) {
            gsap.set(cards, { opacity: 1 });
            return;
          }
          gsap.set(cards, { opacity: 0, y: 28 });
          gsap.to(cards, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.05,
            scrollTrigger: { trigger: grid, start: "top 88%", once: true },
          });
        });

        // ── Stats row reveal ──
        const stats = root.current?.querySelectorAll<HTMLElement>("[data-stat]");
        if (stats?.length) {
          gsap.set(stats, { opacity: 1 });
          if (!reduced) {
            gsap.from(stats, {
              opacity: 0,
              y: 30,
              duration: 1,
              ease: "expo.out",
              stagger: 0.1,
              scrollTrigger: {
                trigger: stats[0],
                start: "top 85%",
                once: true,
              },
            });
          }
        }

        // ── Category jump-nav: underline scroll-spy ──
        const navLinks = root.current?.querySelectorAll<HTMLAnchorElement>("[data-cat-link]");
        navLinks?.forEach((link) => {
          const id = link.getAttribute("href")?.slice(1);
          if (!id) return;
          const target = document.getElementById(id);
          if (!target) return;
          gsap.timeline({
            scrollTrigger: {
              trigger: target,
              start: "top 30%",
              end: "bottom 30%",
              toggleClass: { targets: link, className: "is-active" },
            },
          });
        });
      }, root);

      return () => ctx.revert();
    },
    { scope: root },
  );

  const onJump = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const t = document.getElementById(id);
    if (!t) return;
    const top = t.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div ref={root}>
      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-10 border-y border-line/10 py-12 sm:grid-cols-4 sm:py-16">
        <Stat label="Active clubs" value={clubs.length} suffix="" />
        <Stat label="Members" value={totalMembers} suffix="+" />
        <Stat label="Categories" value={grouped.length} suffix="" />
        <Stat label="Council year" value={2026} prefix="" />
      </div>

      {/* ── Sticky category nav ── */}
      {/* backdrop-blur-md, not -xl: the sticky bar re-blurs its backdrop every
          scroll frame; blur cost scales with radius. md is visually identical
          over bg/85. */}
      <nav className="sticky top-20 z-30 -mx-5 my-12 border-b border-line/10 bg-bg/85 px-5 py-4 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          <span className="kicker shrink-0 text-subtle">Jump to</span>
          {grouped.map((g) => (
            <a
              key={g.key}
              href={`#cat-${g.key}`}
              data-cat-link
              onClick={(e) => onJump(e, `cat-${g.key}`)}
              className={cn(
                "group/n relative shrink-0 whitespace-nowrap py-1 text-sm text-muted transition-colors hover:text-ink",
                "[&.is-active]:text-ink",
              )}
            >
              {g.label}
              <span className="ml-2 font-mono text-[10px] text-subtle">
                {String(g.items.length).padStart(2, "0")}
              </span>
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-ink transition-[width] duration-500 group-hover/n:w-full group-[.is-active]/n:w-full" />
            </a>
          ))}
        </div>
      </nav>

      {/* ── Grouped sections ── */}
      <div className="space-y-32 sm:space-y-40">
        {grouped.map((g, gi) => (
          <section key={g.key} id={`cat-${g.key}`} className="relative">
            {/* Bg watermark - the giant first-tag word, drifting */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 right-0 hidden select-none text-[14rem] font-display italic leading-none text-ink/[0.025] sm:block"
            >
              {g.label.split(" ")[0]}
            </div>

            <header className="relative mb-12 sm:mb-16">
              <div data-group-meta className="mb-6 flex items-center gap-4">
                <span className="font-mono text-xs text-subtle">
                  {String(gi + 1).padStart(2, "0")}
                </span>
                <span className="h-px flex-1 max-w-24 bg-line/20" />
                <span className="kicker">{g.items.length} clubs</span>
              </div>
              <h2
                data-group-title
                className="display text-balance text-5xl leading-[0.9] sm:text-7xl lg:text-8xl"
              >
                {g.label}.
              </h2>
            </header>

            <div
              data-group-grid
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            >
              {g.items.map((club, i) => (
                <ClubCard
                  key={club.slug}
                  club={club}
                  index={i}
                  total={g.items.length}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  prefix,
  suffix = "",
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div data-stat className="flex flex-col gap-3">
      <span className="kicker">{label}</span>
      <span className="display text-5xl text-ink sm:text-6xl">
        <CountUp to={value} prefix={prefix} suffix={suffix} duration={2.2} />
      </span>
    </div>
  );
}
