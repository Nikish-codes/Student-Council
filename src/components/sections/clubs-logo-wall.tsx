"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { gsap, prefersSimpleTextMotion, SplitText, useGSAP } from "@/lib/gsap";
import type { Club } from "@/lib/schemas";

/**
 * Clubs section — a single composed image of every club, served as a static
 * asset under /public/club-wall-{w}.png. We ship 5 pre-rendered widths and
 * let the browser pick via `srcset` + `sizes` — same trick next/image uses,
 * without burning Vercel's optimizer quota. Each variant is sharp-resampled
 * (lanczos3 + light sharpening), so the picked image is pixel-crisp at the
 * actual display size; the browser does at most a tiny scale.
 */
export function ClubsLogoWall({ clubs }: { clubs: Club[] }) {
  const root = React.useRef<HTMLElement>(null);

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
      gsap.set(split.chars, { opacity: 0, y: 100, rotateX: -70, filter: "blur(10px)" });
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

  if (clubs.length === 0) return null;

  return (
    <section
      ref={root}
      aria-label="Student clubs"
      className="relative overflow-hidden border-t border-line/10 bg-bg py-28 sm:py-40"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.05),transparent_45%)]" />

      <div className="container relative z-10">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-14 bg-line/30" aria-hidden />
              <span className="kicker">{clubs.length} communities · one council</span>
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

        <Link
          href="/clubs"
          aria-label="Browse all student clubs"
          className="block"
        >
          {/* WebP first (95 quality, lanczos3 from 7850px native source) with PNG
              fallback for any rare client that lacks WebP. Sizes hint slightly
              overshoots actual CSS px on purpose so retina pulls a larger
              variant — crispness > a few hundred KB. */}
          <picture>
            <source
              type="image/webp"
              srcSet="
                /club-wall-1600.webp 1600w,
                /club-wall-2400.webp 2400w,
                /club-wall-3200.webp 3200w,
                /club-wall-4800.webp 4800w,
                /club-wall-7850.webp 7850w
              "
              sizes="(min-width: 1280px) 1400px, 100vw"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/club-wall-3200.png"
              srcSet="
                /club-wall-1600.png 1600w,
                /club-wall-2400.png 2400w,
                /club-wall-3200.png 3200w,
                /club-wall-4800.png 4800w,
                /club-wall-7850.png 7850w
              "
              sizes="(min-width: 1280px) 1400px, 100vw"
              alt="Every Woxsen student club"
              width={7850}
              height={3378}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full"
            />
          </picture>
        </Link>

        <div className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-3 border-t border-line/10 pt-6 text-center">
          <MiniStat value={clubs.length} label="Clubs" />
          <MiniStat value={uniqueTagCount(clubs)} label="Tags" />
          <MiniStat
            value={clubs.reduce((sum, c) => sum + (c.members ?? 0), 0) || "—"}
            label="Members"
          />
        </div>
      </div>
    </section>
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
