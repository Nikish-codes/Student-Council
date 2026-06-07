"use client";

import * as React from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { CountUp } from "@/components/motion/count-up";

/**
 * Impact strip — full-bleed horizontal numbers between hero and the
 * lazy section block. Single eager-loaded row that signals scale on
 * first-page-load. Numbers in display-italic with Woxsen red accent,
 * labels small + muted. No watermarks, no ghosts, no multi-step
 * animations — just a fade-up on scroll-into-view. This is the
 * "rest beat" calmer than the surrounding kinetic moments.
 */
type ImpactNumber = {
  value: number;
  suffix?: string;
  displayValue?: string;
  label: string;
};

export function ImpactStrip({ numbers }: { numbers: ImpactNumber[] }) {
  const root = React.useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;
      const ctx = gsap.context(() => {
        const items = root.current?.querySelectorAll<HTMLElement>("[data-impact-item]");
        if (!items?.length) return;
        gsap.set(items, { opacity: 1 });
        gsap.from(items, {
          opacity: 0,
          y: 40,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: root.current,
            start: "top 85%",
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
      aria-label="Council impact at a glance"
      className="relative border-y border-line/10 bg-bg"
    >
      <div className="mx-auto grid max-w-[1720px] grid-cols-2 divide-x divide-y divide-line/10 sm:grid-cols-4 sm:divide-y-0">
        {numbers.map((n, i) => (
          <div
            key={n.label}
            data-impact-item
            className="relative flex flex-col items-start gap-3 px-6 py-10 sm:px-10 sm:py-14"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="display italic leading-[0.85] text-accent text-[clamp(3.5rem,8vw,7rem)]">
              {n.displayValue ? (
                n.displayValue
              ) : (
                <CountUp to={n.value} suffix={n.suffix ?? ""} duration={2.2} />
              )}
            </span>
            <span className="kicker text-muted">{n.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
