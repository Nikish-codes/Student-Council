"use client";

import * as React from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import type { ManifestoLine } from "@/lib/schemas";

const FALLBACK_LINES: ManifestoLine[] = [
  { lead: "We don't run", tail: "the desks." },
  { lead: "We open", tail: "the doors." },
  { lead: "Built by students.", tail: "Owned by students." },
  { lead: "If it matters here,", tail: "it starts here." },
];

export function ManifestoKinetic({
  kicker = "Manifesto · 2025/26",
  lines,
  footer = "Read in: 9 seconds",
}: {
  kicker?: string;
  lines?: ManifestoLine[];
  footer?: string;
}) {
  const LINES = lines && lines.length > 0 ? lines : FALLBACK_LINES;
  const root = React.useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      const ctx = gsap.context(() => {
        root.current?.querySelectorAll<HTMLElement>("[data-line]").forEach((line) => {
          const split = new SplitText(line, { type: "words,chars", charsClass: "char" });
          gsap.set(line, { opacity: 1 });
          gsap.set(split.chars, {
            opacity: 0.08,
            y: 10,
          });
          gsap.to(split.chars, {
            opacity: 1,
            y: 0,
            ease: "power2.out",
            duration: 0.6,
            stagger: { each: 0.025 },
            scrollTrigger: {
              trigger: line,
              start: "top 80%",
              end: "top 30%",
              scrub: 0.6,
            },
          });
        });

        // Subtle drift on the section as you scroll past
        const drift = root.current?.querySelector<HTMLElement>("[data-drift]");
        if (drift) {
          gsap.to(drift, {
            xPercent: -20,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
        }
      }, root);

      return () => ctx.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      aria-label="What we stand for"
      className="relative overflow-hidden border-y border-line/10 bg-bg py-32 sm:py-44"
    >
      <div
        data-drift
        aria-hidden
        className="pointer-events-none absolute -top-20 left-0 select-none whitespace-nowrap font-display text-[12rem] italic leading-none text-ink/[0.025] sm:text-[18rem]"
      >
        Of the students. For the students. By the students. ·
      </div>

      <div className="container relative">
        <div className="mb-16 flex items-center gap-3">
          <span className="h-px w-14 bg-line/30" aria-hidden />
          <span className="kicker">{kicker}</span>
        </div>

        <div className="space-y-10 sm:space-y-14">
          {LINES.map((l, i) => (
            <div
              key={i}
              data-line
              className="display text-balance text-5xl leading-[0.95] sm:text-7xl lg:text-[8rem]"
            >
              <span className="text-ink">{l.lead}</span>{" "}
              <span className="italic text-muted">{l.tail}</span>
            </div>
          ))}
        </div>

        <div className="mt-24 flex items-center justify-between gap-6">
          <span className="kicker">{footer}</span>
          <span className="font-mono text-xs text-subtle">04 / 06 — Manifesto</span>
        </div>
      </div>
    </section>
  );
}
