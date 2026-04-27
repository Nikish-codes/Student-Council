"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { Picture } from "@/components/ui/picture";
import { cn } from "@/lib/utils";
import type { Club } from "@/lib/schemas";

/**
 * Full-bleed wall of every club logo. Scroll-in stagger from random,
 * group hover dims everyone except the focused tile.
 */
export function ClubsLogoWall({ clubs }: { clubs: Club[] }) {
  const root = React.useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const headline = root.current?.querySelector<HTMLElement>("[data-wall-headline]");
      if (headline && !reduced) {
        const split = new SplitText(headline, { type: "chars,words", charsClass: "char" });
        gsap.set(headline, { opacity: 1 });
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
      }

      const tiles = root.current?.querySelectorAll<HTMLElement>("[data-tile]");
      if (!tiles?.length) return;

      if (reduced) {
        gsap.set(tiles, { opacity: 1 });
        return;
      }

      const ctx = gsap.context(() => {
        gsap.set(tiles, { opacity: 0, y: 24 });
        gsap.to(tiles, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: { each: 0.025, from: "random" },
          scrollTrigger: {
            trigger: root.current,
            start: "top 80%",
            once: true,
          },
        });
      }, root);

      return () => ctx.revert();
    },
    { scope: root, dependencies: [clubs.length] },
  );

  return (
    <section
      ref={root}
      aria-label="All student clubs"
      className="relative overflow-hidden border-t border-line/10 bg-bg py-32 sm:py-44"
    >
      <div className="container">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-14 bg-line/30" aria-hidden />
              <span className="kicker">{clubs.length} communities · one council</span>
            </div>
            <h2
              data-wall-headline
              className="display text-balance text-5xl leading-[0.92] sm:text-7xl lg:text-8xl"
              style={{ perspective: "800px" }}
            >
              <span className="block">We are</span>
              <span className="block italic text-muted">{clubs.length}.</span>
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
      </div>

      <div className="mx-auto mt-14 flex max-w-[1720px] flex-wrap justify-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-10">
        {clubs.map((club, i) => (
          <Link
            key={club.slug}
            href="/clubs"
            data-tile
            aria-label={club.name}
            className={cn(
              "group/tile relative flex aspect-square w-[min(42vw,10rem)] items-center justify-center overflow-hidden border border-line/12 bg-surface/30 p-5 sm:w-40 sm:p-6 md:w-44 lg:w-48 xl:w-52",
              "transition duration-300 ease-out hover:-translate-y-1 hover:border-line/35 hover:bg-surface/55 hover:shadow-2xl hover:shadow-black/30",
            )}
          >
            <span className="absolute left-3 top-3 font-mono text-[10px] text-subtle opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="relative h-full w-full transition-transform duration-300 group-hover/tile:scale-95">
              <Picture
                src={club.logo}
                alt={club.name}
                fill
                sizes="(min-width: 1280px) 13rem, (min-width: 768px) 11rem, 42vw"
                fallbackLabel={club.name.slice(0, 2).toUpperCase()}
                className="object-contain"
              />
            </div>
            <span className="absolute inset-x-3 bottom-3 truncate text-center font-mono text-[10px] uppercase tracking-widest text-muted opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100">
              {club.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
