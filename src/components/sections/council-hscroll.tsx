"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CouncilCardSize } from "@/lib/schemas";
import type { CouncilMemberWithCoLeads } from "@/lib/content";
import { CouncilCard } from "@/components/sections/council-card";

/**
 * Horizontally-scrolling card track with auto-scroll + drag-to-scroll.
 *
 * Auto-scrolls slowly by default; pauses on hover, drag, or touch. On release
 * it resumes after a short delay. Drag works with both mouse and touch via
 * Pointer Events — one code path, both platforms.
 *
 * Cards are sized to match the core member grid cards (md), not the narrower
 * sm widths the old hscroll used, so club presidents read at the same scale
 * as every other section.
 */

const CARD_WIDTH =
  "w-[82vw] min-w-[260px] max-w-[340px] sm:w-[300px] lg:w-[320px]";

const AUTO_PX_PER_SEC = 48;
const RESUME_DELAY_MS = 1200;

export function CouncilHScroll({
  members,
  cardSize = "md",
  openMember,
}: {
  members: CouncilMemberWithCoLeads[];
  cardSize?: CouncilCardSize;
  openMember?: (m: CouncilMemberWithCoLeads) => void;
}) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const lastTsRef = React.useRef(0);
  const pausedRef = React.useRef(false);
  const resumeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // ── Drag state ──
  const dragRef = React.useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

  // ── Auto-scroll loop ──
  React.useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const step = (ts: number) => {
      rafRef.current = requestAnimationFrame(step);
      if (pausedRef.current || dragRef.current.active) {
        lastTsRef.current = ts;
        return;
      }
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      const delta = AUTO_PX_PER_SEC * dt;
      el.scrollLeft += delta;
      // Seamless loop: we render the cards twice, so when the scroll passes
      // the midpoint (one full set), we wrap back to the start of the first
      // set. Because the content is identical, the jump is invisible.
      const half = el.scrollWidth / 2;
      if (el.scrollLeft >= half) {
        el.scrollLeft -= half;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const pauseAuto = React.useCallback(() => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, []);

  const resumeAuto = React.useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, RESUME_DELAY_MS);
  }, []);

  // ── Drag-to-scroll (pointer events — mouse + touch) ──
  const onPointerDown = React.useCallback((e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el) return;
    // Don't hijack clicks on links/buttons inside cards.
    const target = e.target as HTMLElement;
    if (target.closest("a,button")) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
    pauseAuto();
  }, [pauseAuto]);

  const onPointerMove = React.useCallback((e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el || !dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 4) dragRef.current.moved = true;
    el.scrollLeft = dragRef.current.startScroll - dx;
  }, []);

  const onPointerUp = React.useCallback((e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el) return;
    if (dragRef.current.active && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    dragRef.current.active = false;
    resumeAuto();
  }, [resumeAuto]);

  // Prevent click navigation after a drag (so releasing on a card doesn't
  // trigger its onOpen if the user was just scrolling).
  const onClickCapture = React.useCallback((e: React.MouseEvent) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  }, []);

  // ── Arrow-button scroll: jump by one card width ──
  const scrollByCard = React.useCallback(
    (dir: 1 | -1) => {
      const el = trackRef.current;
      if (!el) return;
      const card = el.querySelector<HTMLDivElement>("[data-card]");
      const step = (card?.offsetWidth ?? 320) + 16; // +gap-4
      // Seamless loop: if scrolling left past the start, jump forward by one
      // full set first so there's content to scroll into.
      const half = el.scrollWidth / 2;
      if (dir === -1 && el.scrollLeft < step) {
        el.scrollLeft += half;
      }
      el.scrollBy({ left: dir * step, behavior: "smooth" });
      pauseAuto();
      resumeAuto();
    },
    [pauseAuto, resumeAuto],
  );

  return (
    <div className="relative">
      {/* Arrow buttons — desktop only (touch users drag). */}
      <button
        type="button"
        onClick={() => scrollByCard(-1)}
        aria-label="Scroll left"
        className="absolute left-0 top-1/2 z-10 hidden -translate-x-2 -translate-y-1/2 items-center justify-center rounded-full border border-line/15 bg-bg/80 p-2 backdrop-blur-md transition-all hover:border-line/40 hover:bg-bg sm:flex"
      >
        <ChevronLeft className="h-5 w-5 text-ink" />
      </button>
      <button
        type="button"
        onClick={() => scrollByCard(1)}
        aria-label="Scroll right"
        className="absolute right-0 top-1/2 z-10 hidden translate-x-2 -translate-y-1/2 items-center justify-center rounded-full border border-line/15 bg-bg/80 p-2 backdrop-blur-md transition-all hover:border-line/40 hover:bg-bg sm:flex"
      >
        <ChevronRight className="h-5 w-5 text-ink" />
      </button>

      <div
        data-card-track
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        className={cn(
          "no-scrollbar mask-fade-x flex cursor-grab gap-4 overflow-x-auto pb-2",
          "active:cursor-grabbing",
          "-mx-5 px-5 sm:-mx-0 sm:px-0",
        )}
        style={{ touchAction: "pan-y" }}
      >
        {[...members, ...members].map((m, i) => (
          <div
            key={`${m.id}-${i}`}
            data-card
            className={cn("shrink-0", CARD_WIDTH)}
          >
            <CouncilCard
              member={m}
              index={i % members.length}
              size={cardSize}
              onOpen={openMember ? () => openMember(m) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
