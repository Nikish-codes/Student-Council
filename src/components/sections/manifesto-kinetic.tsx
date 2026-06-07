"use client";

import * as React from "react";
import { gsap, prefersSimpleTextMotion, SplitText, useGSAP } from "@/lib/gsap";
import type { ManifestoLine } from "@/lib/schemas";

const FALLBACK_LINES: ManifestoLine[] = [
  { lead: "We don't run", tail: "the desks." },
  { lead: "We open", tail: "the doors." },
  { lead: "Built by students.", tail: "Owned by students." },
  { lead: "If it matters here,", tail: "it starts here." },
];

export function ManifestoKinetic({
  kicker = "Manifesto · 2026/27",
  lines,
  footer = "Read in: 9 seconds",
}: {
  kicker?: string;
  lines?: ManifestoLine[];
  footer?: string;
}) {
  void kicker;
  void footer;
  const LINES = lines && lines.length > 0 ? lines : FALLBACK_LINES;
  const root = React.useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const simpleText = prefersSimpleTextMotion();
      if (reduced) return;

      const ctx = gsap.context(() => {
        root.current?.querySelectorAll<HTMLElement>("[data-line]").forEach((line) => {
          gsap.set(line, { opacity: 1 });
          if (simpleText) {
            gsap.from(line, {
              opacity: 0,
              y: 22,
              duration: 0.65,
              ease: "power2.out",
              scrollTrigger: { trigger: line, start: "top 82%", once: true },
            });
            return;
          }
          const split = new SplitText(line, { type: "words,chars", charsClass: "char" });
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
      className="relative overflow-hidden border-y border-line/10 bg-surface py-32 sm:py-44"
    >
      <div
        data-drift
        aria-hidden
        className="pointer-events-none absolute -top-20 left-0 select-none whitespace-nowrap font-display text-[clamp(4rem,18vw,12rem)] italic leading-none text-ink/[0.025] sm:text-[18rem]"
      >
        Of the students. For the students. By the students. ·
      </div>

      <div className="container relative">
        <div className="space-y-10 sm:space-y-14">
          {LINES.map((l, i) => (
            <div
              key={i}
              data-line
              className="display text-balance text-5xl leading-[0.95] sm:text-7xl lg:text-[8rem]"
            >
              <span className="text-ink">{l.lead}</span>{" "}
              <span className="italic text-accent">{l.tail}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
