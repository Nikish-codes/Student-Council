"use client";

import * as React from "react";

/**
 * Subtle full-screen hero background — a soft mouse-reactive dot field with
 * slow sine drift, drawn with Canvas2D.
 *
 * Perf notes (slow-laptop budget):
 * - Dots are batched by quantized alpha: one beginPath/fill per alpha bucket
 *   (~14 fills/frame) instead of one per dot (~2,000/frame before).
 * - The rAF loop fully stops while the hero is out of the viewport
 *   (IntersectionObserver) — scrolling the rest of the page costs nothing.
 * - Drawing freezes during scroll frames; the scroll-scrub parallax on the
 *   container moves the held frame, which reads as motion anyway.
 * - DPR capped at 1.5 — sub-2px dots at ≤0.2 alpha don't need retina rasters.
 */
export function HeroCanvas() {
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
    let driftT = 0;
    let lastNow = performance.now();
    const mouse = { x: 0, y: 0, has: false };
    let dotColor = "245,245,244"; // dark mode default — light dots
    const updateDotColor = () => {
      // In light mode, draw dark dots so the field is visible against the
      // white bg. In dark mode, keep the warm-white dots.
      dotColor = document.documentElement.classList.contains("light")
        ? "17,17,17"
        : "245,245,244";
    };
    updateDotColor();
    const themeObserver = new MutationObserver(updateDotColor);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.has = true;
    };
    const onLeave = () => {
      mouse.has = false;
    };

    // Alpha buckets: all non-mouse dots share r=0.6, so dots quantized to the
    // same alpha can be built into ONE path and filled in ONE call. Alphas
    // span ~0.04–0.19 → 16 buckets ≈ 0.01 steps, below visible banding.
    const BUCKETS = 16;
    const A_MIN = 0.04;
    const A_MAX = 0.19;
    const bucketPaths: Path2D[] = new Array(BUCKETS);

    const drawFrame = (now: number) => {
      driftT += Math.min(now - lastNow, 64);
      lastNow = now;
      const t = driftT / 1000;
      ctx.clearRect(0, 0, w, h);

      const cols = 60;
      const rows = Math.ceil((cols * h) / w);
      const cellW = w / cols;
      const cellH = h / rows;

      for (let b = 0; b < BUCKETS; b++) bucketPaths[b] = new Path2D();

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * cellW + cellW / 2;
          const y = j * cellH + cellH / 2;

          const wave =
            Math.sin(i * 0.22 + t * 0.6) +
            Math.cos(j * 0.18 - t * 0.4) +
            Math.sin((i + j) * 0.12 + t * 0.3);

          const baseAlpha = reduced ? 0.06 : 0.04 + (wave + 3) * 0.025;

          // Mouse-proximate dots grow and brighten individually — draw those
          // immediately; everything else goes into its alpha bucket's path.
          if (mouse.has) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const dist = Math.hypot(dx, dy);
            const proximity = Math.max(0, 1 - dist / 240);
            if (proximity > 0) {
              ctx.beginPath();
              ctx.fillStyle = `rgba(${dotColor},${baseAlpha + proximity * 0.55})`;
              ctx.arc(x, y, 0.6 + proximity * 1.8, 0, Math.PI * 2);
              ctx.fill();
              continue;
            }
          }

          const b = Math.min(
            BUCKETS - 1,
            Math.max(0, Math.round(((baseAlpha - A_MIN) / (A_MAX - A_MIN)) * (BUCKETS - 1))),
          );
          const p = bucketPaths[b];
          p.moveTo(x + 0.6, y);
          p.arc(x, y, 0.6, 0, Math.PI * 2);
        }
      }

      for (let b = 0; b < BUCKETS; b++) {
        const alpha = A_MIN + (b / (BUCKETS - 1)) * (A_MAX - A_MIN);
        ctx.fillStyle = `rgba(${dotColor},${alpha})`;
        ctx.fill(bucketPaths[b]);
      }
    };

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
        lastNow = now;
      } else {
        drawFrame(now);
      }
      raf = requestAnimationFrame(loop);
    };

    // Stop the loop entirely once the hero leaves the viewport.
    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        const nowVisible = entry.isIntersecting;
        if (nowVisible && !visible) {
          visible = true;
          lastNow = performance.now();
          raf = requestAnimationFrame(loop);
        } else if (!nowVisible && visible) {
          visible = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 },
    );

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMove, { passive: true });
    canvas.addEventListener("mouseleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    io.observe(canvas);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(scrollIdle);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 h-full w-full"
    />
  );
}
