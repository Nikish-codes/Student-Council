"use client";

import * as React from "react";

/**
 * A fixed, GPU-friendly animated dot grid background.
 * Drifts slowly; brightens around the cursor.
 *
 * Perf notes (this thing is on EVERY page, behind everything):
 * - The base grid is a pre-rendered spacing×spacing pattern tile stamped with
 *   one fillRect per frame — O(1) instead of one arc()+fill() per dot
 *   (~2,600/frame on a laptop viewport before).
 * - Only dots within the cursor's glow radius are drawn individually.
 * - Drawing is frozen while the page scrolls (the drift moves 6px/s — a held
 *   frame during scroll is imperceptible) so scroll frames get the full budget.
 * - DPR is capped at 1.5: these are ≤2px dots at ≤0.5 alpha; retina-exact
 *   rasterization of them is invisible but doubles the pixels touched.
 * - Reduced motion: one static draw, no rAF loop at all.
 */
export function DottedBackground() {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let raf = 0;
    // Drift clock accumulates only while frames are actually drawn, so
    // resuming after a scroll-freeze continues from the held position instead
    // of snapping to where wall-clock time says the grid "should" be.
    let driftT = 0;
    let lastNow = performance.now();
    const mouse = { x: -9999, y: -9999 };

    const spacing = 28;
    const GLOW_RADIUS = 180;

    // Pre-render one grid cell (a single base dot) into a pattern tile.
    let pattern: CanvasPattern | null = null;
    const buildPattern = () => {
      const tile = document.createElement("canvas");
      tile.width = Math.round(spacing * dpr);
      tile.height = Math.round(spacing * dpr);
      const tctx = tile.getContext("2d");
      if (!tctx) return;
      tctx.scale(dpr, dpr);
      tctx.fillStyle = "rgba(245,245,244,0.05)";
      tctx.beginPath();
      tctx.arc(spacing / 2, spacing / 2, 0.8, 0, Math.PI * 2);
      tctx.fill();
      pattern = ctx.createPattern(tile, "repeat");
      // Pattern pixels are dpr-scaled; counter the context's dpr scale so one
      // tile maps back to spacing×spacing CSS px.
      pattern?.setTransform(new DOMMatrix().scale(1 / dpr));
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      buildPattern();
    };

    const drawFrame = (now: number) => {
      driftT += Math.min(now - lastNow, 64); // clamp tab-suspend gaps
      lastNow = now;
      ctx.clearRect(0, 0, w, h);

      const offset = reduced ? 0 : ((driftT / 1000) * 6) % spacing;
      const ox = offset;
      const oy = offset * 0.6;

      // Base grid: one pattern-filled rect. Dot centers sit at
      // (col*spacing + spacing/2 + ox, row*spacing + spacing/2 + oy).
      if (pattern) {
        ctx.save();
        ctx.translate(ox - spacing, oy - spacing);
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, w + spacing * 2, h + spacing * 2);
        ctx.restore();
      }

      // Cursor glow: draw ONLY the dots inside the glow radius, brighter and
      // bigger, on top of their base selves.
      if (mouse.x > -9000) {
        const c0 = Math.floor((mouse.x - GLOW_RADIUS - ox) / spacing);
        const c1 = Math.ceil((mouse.x + GLOW_RADIUS - ox) / spacing);
        const r0 = Math.floor((mouse.y - GLOW_RADIUS - oy) / spacing);
        const r1 = Math.ceil((mouse.y + GLOW_RADIUS - oy) / spacing);
        for (let row = r0; row <= r1; row++) {
          for (let col = c0; col <= c1; col++) {
            const px = col * spacing + spacing / 2 + ox;
            const py = row * spacing + spacing / 2 + oy;
            const dist = Math.hypot(px - mouse.x, py - mouse.y);
            const proximity = Math.max(0, 1 - dist / GLOW_RADIUS);
            if (proximity <= 0) continue;
            ctx.beginPath();
            ctx.fillStyle = `rgba(245,245,244,${0.05 + proximity * 0.45})`;
            ctx.arc(px, py, 0.8 + proximity * 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    };

    // Freeze while scrolling: the held frame is visually identical (drift is
    // 6px/s ≈ 0.1px/frame) and it hands the whole frame budget to the scroll.
    let scrolling = false;
    let scrollIdle = 0;
    const onScroll = () => {
      scrolling = true;
      window.clearTimeout(scrollIdle);
      scrollIdle = window.setTimeout(() => {
        scrolling = false;
      }, 120);
    };

    const loop = (now: number) => {
      if (scrolling) {
        lastNow = now; // hold the drift clock while frozen
      } else {
        drawFrame(now);
      }
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      // Reduced-motion mode has no loop — repaint on demand for the glow.
      if (reduced && !raf) {
        raf = requestAnimationFrame((n) => {
          raf = 0;
          drawFrame(n);
        });
      }
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
      if (reduced) drawFrame(performance.now());
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);

    if (reduced) {
      drawFrame(performance.now());
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(scrollIdle);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.5]"
    />
  );
}
