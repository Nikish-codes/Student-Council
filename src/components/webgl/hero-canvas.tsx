"use client";

import * as React from "react";

/**
 * Subtle full-screen WebGL hero background.
 * Uses Canvas2D for now (no native webgl context dependency); a soft
 * mouse-reactive dot field with slow drift. Replace with an OGL/three
 * shader later — kept lightweight for v1.
 */
export function HeroCanvas() {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    const t0 = performance.now();
    const mouse = { x: 0, y: 0, has: false };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);

      const cols = 60;
      const rows = Math.ceil((cols * h) / w);
      const cellW = w / cols;
      const cellH = h / rows;

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * cellW + cellW / 2;
          const y = j * cellH + cellH / 2;

          const wave =
            Math.sin(i * 0.22 + t * 0.6) +
            Math.cos(j * 0.18 - t * 0.4) +
            Math.sin((i + j) * 0.12 + t * 0.3);

          const baseAlpha = reduced ? 0.06 : 0.04 + (wave + 3) * 0.025;

          let alpha = baseAlpha;
          let r = 0.6;
          if (mouse.has) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const dist = Math.hypot(dx, dy);
            const proximity = Math.max(0, 1 - dist / 240);
            alpha += proximity * 0.55;
            r += proximity * 1.8;
          }

          ctx.beginPath();
          ctx.fillStyle = `rgba(245,245,244,${alpha})`;
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
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
