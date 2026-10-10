"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vrot: number;
  color: string;
};

export function Confetti({
  colors,
  count = 220,
  duration = 5200,
}: {
  colors: string[];
  count?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = (canvas.width = window.innerWidth * dpr);
    const h = (canvas.height = window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const fromLeft = i % 2 === 0;
      const spread = (Math.random() - 0.5) * 1.1;
      const power = (9 + Math.random() * 11) * dpr;
      particles.push({
        x: fromLeft ? 0 : w,
        y: h * (0.85 + Math.random() * 0.15),
        vx: (fromLeft ? 1 : -1) * power * (0.7 + Math.random() * 0.6),
        vy: -power * (1 + Math.random() * 0.5) + spread * power,
        size: (5 + Math.random() * 9) * dpr,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.35,
        color: colors[i % colors.length],
      });
    }

    const gravity = 0.26 * dpr;
    const drag = 0.992;
    const start = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, w, h);
      const fade = Math.max(
        0,
        1 - Math.max(0, t - duration * 0.6) / (duration * 0.4),
      );

      for (const p of particles) {
        p.vy += gravity;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        if (p.y > h + 60 * dpr) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.color;
        ctx.fillRect(
          -p.size / 2,
          -p.size / 4,
          p.size,
          p.size * 0.5 * Math.abs(Math.cos(p.rot)),
        );
        ctx.restore();
      }

      if (t < duration) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [colors, count, duration]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[60]"
    />
  );
}
