"use client";

import * as React from "react";
import { ArrowUpRight, Users } from "lucide-react";
import { Picture } from "@/components/ui/picture";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { Club } from "@/lib/schemas";

type Size = "hero" | "wide" | "tall" | "std";

interface Props {
  club: Club;
  size?: Size;
  index: number;
  total: number;
}

const SIZE_CLASSES: Record<Size, string> = {
  hero: "md:col-span-2 md:row-span-2 min-h-[460px]",
  wide: "md:col-span-2 min-h-[260px]",
  tall: "md:row-span-2 min-h-[460px]",
  std: "min-h-[260px]",
};

export function ClubCard({ club, size = "std", index, total }: Props) {
  const ref = React.useRef<HTMLAnchorElement>(null);
  const logoRef = React.useRef<HTMLDivElement>(null);
  const haloRef = React.useRef<HTMLDivElement>(null);
  const borderRef = React.useRef<SVGRectElement>(null);

  // Cursor tilt + halo follow
  useGSAP(
    () => {
      const el = ref.current;
      const logo = logoRef.current;
      const halo = haloRef.current;
      const border = borderRef.current;
      if (!el || !logo || !halo || !border) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      const xTo = gsap.quickTo(logo, "rotationY", { duration: 0.6, ease: "power3.out" });
      const yTo = gsap.quickTo(logo, "rotationX", { duration: 0.6, ease: "power3.out" });
      const sTo = gsap.quickTo(logo, "scale", { duration: 0.6, ease: "power3.out" });
      const hxTo = gsap.quickTo(halo, "x", { duration: 0.4, ease: "power3.out" });
      const hyTo = gsap.quickTo(halo, "y", { duration: 0.4, ease: "power3.out" });

      const perimeter = (border.getBoundingClientRect().width + border.getBoundingClientRect().height) * 2;
      gsap.set(border, { strokeDasharray: perimeter, strokeDashoffset: perimeter, opacity: 0 });

      const onMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        xTo((px - 0.5) * 18);
        yTo(-(py - 0.5) * 18);
        hxTo((px - 0.5) * rect.width * 0.4);
        hyTo((py - 0.5) * rect.height * 0.4);
      };
      const onEnter = () => {
        sTo(1.06);
        gsap.to(border, { strokeDashoffset: 0, opacity: 1, duration: 1.2, ease: "expo.out" });
        gsap.to(halo, { opacity: 1, duration: 0.5 });
      };
      const onLeave = () => {
        xTo(0);
        yTo(0);
        sTo(1);
        gsap.to(border, { strokeDashoffset: perimeter, opacity: 0, duration: 0.8, ease: "power3.out" });
        gsap.to(halo, { opacity: 0, duration: 0.4, x: 0, y: 0 });
      };

      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
      return () => {
        el.removeEventListener("mousemove", onMove);
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      };
    },
    { scope: ref },
  );

  const isHero = size === "hero";
  const fallbackLabel = club.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 3);

  return (
    <a
      ref={ref}
      href={club.joinUrl ?? "#"}
      target={club.joinUrl ? "_blank" : undefined}
      rel={club.joinUrl ? "noreferrer" : undefined}
      data-club-card
      className={cn(
        "group/c relative flex flex-col overflow-hidden rounded-2xl border border-line/10 bg-surface/50 p-7 transition-colors duration-500 hover:border-line/30",
        SIZE_CLASSES[size],
      )}
      style={{ perspective: "1000px" }}
    >
      {/* Cursor halo (plain alpha blend — no mix-blend-screen, which forces an
          expensive backdrop recomposite per card during scroll) */}
      <div
        ref={haloRef}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[160%] w-[160%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.08), transparent 55%)",
        }}
      />

      {/* Drawing border */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
      >
        <rect
          ref={borderRef}
          x="0.5"
          y="0.5"
          width="calc(100% - 1px)"
          height="calc(100% - 1px)"
          rx="16"
          fill="none"
          stroke="rgb(255 255 255 / 0.55)"
          strokeWidth="1"
        />
      </svg>

      {/* Index */}
      <div className="absolute left-7 top-7 z-10 font-mono text-[10px] uppercase tracking-[0.22em] text-subtle">
        {String(index + 1).padStart(2, "0")}
        <span className="text-subtle/40"> / {String(total).padStart(2, "0")}</span>
      </div>

      <ArrowUpRight className="absolute right-6 top-6 z-10 h-5 w-5 text-muted transition-all duration-500 group-hover/c:-translate-y-0.5 group-hover/c:translate-x-0.5 group-hover/c:text-ink" />

      {/* Logo - dominant element */}
      <div
        className={cn(
          "relative z-0 flex flex-1 items-center justify-center",
          isHero ? "min-h-[260px]" : "min-h-[140px]",
        )}
      >
        <div
          ref={logoRef}
          data-club-logo
          className={cn(
            "relative aspect-square",
            isHero ? "w-[58%] max-w-[280px]" : "w-[55%] max-w-[140px]",
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Glow under logo */}
          <div
            aria-hidden
            className="absolute inset-[-30%] rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover/c:opacity-100"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.18), transparent 60%)",
            }}
          />
          <Picture
            src={club.logo}
            alt={`${club.name} logo`}
            fallbackLabel={fallbackLabel}
            className="relative h-full w-full object-contain transition-all duration-700 ease-out"
          />
        </div>
      </div>

      {/* Body */}
      <div className="relative z-10 mt-6 space-y-4">
        <h3
          className={cn(
            "display text-ink",
            isHero ? "text-4xl sm:text-5xl" : "text-2xl",
          )}
        >
          {club.name}
        </h3>
        <p
          className={cn(
            "text-pretty text-muted",
            isHero ? "text-base leading-relaxed" : "text-sm leading-relaxed",
            "line-clamp-2",
            isHero && "line-clamp-3",
          )}
        >
          {club.blurb}
        </p>

        <div className="flex items-center justify-between gap-3 border-t border-line/10 pt-4">
          <div className="flex flex-wrap gap-1.5">
            {club.tags.slice(0, isHero ? 3 : 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-line/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors group-hover/c:border-line/25 group-hover/c:text-ink"
              >
                {tag}
              </span>
            ))}
          </div>
          {club.members && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-subtle">
              <Users className="h-3 w-3" />
              {club.members}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
