"use client";

import * as React from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { CountUp } from "@/components/motion/count-up";
import type { HomepageStat } from "@/lib/schemas";

const FALLBACK_STATS: HomepageStat[] = [
  { value: 29, label: "Student-run clubs" },
  { value: 8, label: "Schools represented" },
  { value: 200, suffix: "+", label: "Events every year" },
  { value: 5000, suffix: "+", label: "Active students", displayValue: "5K+" },
  { value: 1, label: "Council, of you" },
];

export function StatsSymphony({
  kicker = "By the numbers · 2026/27",
  stats,
}: {
  kicker?: string;
  stats?: HomepageStat[];
}) {
  const STATS = stats && stats.length > 0 ? stats : FALLBACK_STATS;
  const root = React.useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;
      const ctx = gsap.context(() => {
        const items = root.current?.querySelectorAll<HTMLElement>("[data-stat]");
        if (!items?.length) return;
        gsap.set(items, { opacity: 1 });
        gsap.from(items, {
          y: 80,
          opacity: 0,
          filter: "blur(12px)",
          duration: 1.2,
          ease: "expo.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: root.current,
            start: "top 80%",
            once: true,
          },
        });
      }, root);
      return () => ctx.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      aria-label="Council at a glance"
      className="relative border-y border-line/10 bg-surface/30 py-32 sm:py-40"
    >
      <div className="container">
        <div className="mb-10 flex items-center gap-3">
          <span className="h-px w-14 bg-line/30" aria-hidden />
          <span className="kicker">{kicker}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
          {STATS.map((s, i) => (
            <div key={s.label} data-stat className="flex flex-col gap-4">
              <span className="font-mono text-[10px] text-subtle">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="display text-balance text-6xl italic leading-[0.85] sm:text-7xl lg:text-8xl">
                {s.displayValue ? (
                  s.displayValue
                ) : (
                  <CountUp to={s.value} suffix={s.suffix ?? ""} duration={2.4} />
                )}
              </span>
              <span className="kicker text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
