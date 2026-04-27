"use client";

import * as React from "react";
import { gsap, useGSAP } from "@/lib/gsap";

interface Props {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** Animates a counter from 0 → `to` once it enters the viewport. */
export function CountUp({ to, duration = 2, prefix, suffix, className }: Props) {
  const ref = React.useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        el.textContent = `${prefix ?? ""}${to}${suffix ?? ""}`;
        return;
      }
      const obj = { v: 0 };
      gsap.to(obj, {
        v: to,
        duration,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => {
          el.textContent = `${prefix ?? ""}${Math.round(obj.v)}${suffix ?? ""}`;
        },
      });
    },
    { scope: ref, dependencies: [to, duration] },
  );

  return (
    <span ref={ref} className={className}>
      {prefix ?? ""}0{suffix ?? ""}
    </span>
  );
}
