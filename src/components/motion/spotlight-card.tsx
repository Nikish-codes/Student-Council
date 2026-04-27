"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "a" | "article";
  href?: string;
}

export function SpotlightCard({
  className,
  children,
  as = "div",
  href,
  ...props
}: SpotlightCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const Tag = (as === "a" ? "a" : as) as React.ElementType;

  return (
    <Tag
      ref={ref as never}
      href={href}
      onMouseMove={onMove}
      className={cn(
        "group/spot relative isolate overflow-hidden rounded-2xl border border-line/[0.08] bg-surface/40 transition-colors duration-500 hover:border-line/20",
        className,
      )}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--mx,50%) var(--my,50%), rgb(255 255 255 / 0.08), transparent 60%)",
        }}
      />
      {children}
    </Tag>
  );
}
