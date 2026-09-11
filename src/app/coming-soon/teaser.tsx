"use client";

import { useEffect, useState } from "react";

/**
 * Full-screen "Coming Soon" teaser. Standalone (lives at the app root, not under
 * the (site) group) so it carries none of the real site's header/footer/content.
 * Anticipation-first: brand-accent aurora, a light sweep across the wordmark, and
 * an optional countdown driven by NEXT_PUBLIC_LAUNCH_DATE (ISO string). If that
 * env var is unset or in the past, the countdown gracefully disappears.
 */

const LAUNCH = process.env.NEXT_PUBLIC_LAUNCH_DATE;

type Remaining = { days: number; hours: number; mins: number; secs: number };

function diff(target: number): Remaining | null {
  const ms = target - Date.now();
  if (ms <= 0) return null;
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    mins: Math.floor((ms / 60_000) % 60),
    secs: Math.floor((ms / 1000) % 60),
  };
}

function Countdown() {
  const target = LAUNCH ? new Date(LAUNCH).getTime() : NaN;
  const valid = Number.isFinite(target);
  const [left, setLeft] = useState<Remaining | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!valid) return;
    setMounted(true);
    setLeft(diff(target));
    const id = setInterval(() => setLeft(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target, valid]);

  // Render nothing until mounted (avoids hydration mismatch) or if no valid,
  // future launch date is configured.
  if (!valid || !mounted || !left) return null;

  const units: Array<[number, string]> = [
    [left.days, "Days"],
    [left.hours, "Hrs"],
    [left.mins, "Min"],
    [left.secs, "Sec"],
  ];

  return (
    <div className="cs-count" aria-label="Time until launch">
      {units.map(([value, label], i) => (
        <div className="cs-count__cell" key={label}>
          <span className="cs-count__num">
            {String(value).padStart(2, "0")}
          </span>
          <span className="cs-count__label">{label}</span>
          {i < units.length - 1 && <span className="cs-count__sep">:</span>}
        </div>
      ))}
    </div>
  );
}

export function Teaser() {
  return (
    <main className="cs-root">
      <div className="cs-aurora" aria-hidden />
      <div className="cs-grid" aria-hidden />

      <div className="cs-inner">
        {/* The teaser is always dark, so this one never needed a second
            variant — only a web-sized asset for its 72px box. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="cs-mark"
          src="/brand/sc-crest.webp"
          alt="Woxsen Student Council"
          width={72}
          height={72}
        />

        <p className="cs-kicker">Woxsen&nbsp;Student&nbsp;Council</p>

        <h1 className="cs-title">
          <span className="cs-title__line">Coming</span>
          <span className="cs-title__line cs-title__line--accent">Soon</span>
          <span className="cs-sweep" aria-hidden />
        </h1>

        <p className="cs-sub">
          A new home for every event, every club, every student voice —
          <br className="cs-br" /> we&apos;re putting the finishing touches on
          something worth the wait.
        </p>

        <Countdown />

        <a
          href="/clubsignup"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
        >
          Sign up for a club
        </a>

        <div className="cs-tag">
          <span className="cs-dot" />
          <span>Launching soon · stay tuned</span>
        </div>
      </div>

      {/* Discreet door for the team — a valid login unlocks the real site. */}
      <a className="cs-signin" href="/management/login">
        Team? Sign in →
      </a>

      <style>{css}</style>
    </main>
  );
}

const css = `
.cs-root {
  position: relative;
  min-height: 100svh;
  overflow: hidden;
  display: grid;
  place-items: center;
  background:
    radial-gradient(120% 90% at 50% -10%, rgb(var(--accent) / 0.16), transparent 60%),
    rgb(var(--bg));
  color: rgb(var(--ink));
  font-family: var(--font-sans), system-ui, sans-serif;
  padding: 2rem;
  isolation: isolate;
}

/* Slow-drifting accent aurora blobs */
.cs-aurora {
  position: absolute;
  inset: -20%;
  z-index: -2;
  background:
    radial-gradient(38% 38% at 22% 30%, rgb(var(--accent) / 0.28), transparent 70%),
    radial-gradient(34% 34% at 80% 65%, rgb(var(--accent) / 0.20), transparent 72%),
    radial-gradient(30% 30% at 60% 20%, rgb(var(--ink) / 0.05), transparent 70%);
  filter: blur(40px) saturate(1.2);
  animation: cs-drift 18s ease-in-out infinite alternate;
}
@keyframes cs-drift {
  0%   { transform: translate3d(-3%, -2%, 0) scale(1); }
  100% { transform: translate3d(4%, 3%, 0) scale(1.08); }
}

/* Faint blueprint grid for depth */
.cs-grid {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image:
    linear-gradient(rgb(var(--line) / 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgb(var(--line) / 0.05) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(circle at 50% 45%, black, transparent 78%);
}

.cs-inner {
  position: relative;
  text-align: center;
  max-width: 46rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: cs-rise 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes cs-rise {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}

.cs-mark {
  width: clamp(52px, 8vw, 72px);
  height: auto;
  margin-bottom: 1.75rem;
  opacity: 0.95;
  filter: drop-shadow(0 0 24px rgb(var(--accent) / 0.35));
  animation: cs-float 5s ease-in-out infinite;
}
@keyframes cs-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}

.cs-kicker {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: clamp(0.62rem, 1.6vw, 0.78rem);
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: rgb(var(--ink) / 0.62);
  margin: 0 0 1.1rem;
  padding-left: 0.42em;
}

.cs-title {
  position: relative;
  font-family: var(--font-display), Georgia, serif;
  font-weight: 600;
  line-height: 0.9;
  letter-spacing: -0.02em;
  font-size: clamp(4rem, 17vw, 11rem);
  margin: 0;
  text-transform: uppercase;
}
.cs-title__line { display: block; }
.cs-title__line--accent {
  color: rgb(var(--accent));
  text-shadow: 0 0 60px rgb(var(--accent) / 0.45);
}

/* Light sweep across the wordmark */
.cs-sweep {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    transparent 30%,
    rgb(var(--ink) / 0.55) 48%,
    transparent 66%
  );
  mix-blend-mode: overlay;
  transform: translateX(-120%);
  animation: cs-sweep 4.5s cubic-bezier(0.6, 0, 0.2, 1) infinite;
  pointer-events: none;
}
@keyframes cs-sweep {
  0%, 55% { transform: translateX(-120%); }
  85%, 100% { transform: translateX(120%); }
}

.cs-sub {
  margin: 1.9rem 0 0;
  font-size: clamp(1rem, 2.4vw, 1.22rem);
  line-height: 1.6;
  color: rgb(var(--ink) / 0.72);
  max-width: 34rem;
}

.cs-count {
  display: flex;
  align-items: flex-start;
  gap: clamp(0.6rem, 2.5vw, 1.6rem);
  margin-top: 2.6rem;
}
.cs-count__cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: clamp(3.2rem, 9vw, 4.6rem);
}
.cs-count__num {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: clamp(1.9rem, 6vw, 3rem);
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--ink));
}
.cs-count__label {
  margin-top: 0.6rem;
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: 0.6rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgb(var(--ink) / 0.5);
}
.cs-count__sep {
  position: absolute;
  right: clamp(-0.5rem, -1.3vw, -0.85rem);
  top: 0;
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: clamp(1.6rem, 5vw, 2.6rem);
  line-height: 1;
  color: rgb(var(--accent) / 0.7);
  animation: cs-blink 1s steps(2, start) infinite;
}
@keyframes cs-blink { 50% { opacity: 0.25; } }

.cs-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 2.8rem;
  padding: 0.5rem 1rem;
  border: 1px solid rgb(var(--line) / 0.14);
  border-radius: 999px;
  background: rgb(var(--ink) / 0.03);
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: 0.68rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgb(var(--ink) / 0.68);
}
.cs-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgb(var(--accent));
  box-shadow: 0 0 0 0 rgb(var(--accent) / 0.6);
  animation: cs-pulse 1.8s ease-out infinite;
}
@keyframes cs-pulse {
  0%   { box-shadow: 0 0 0 0 rgb(var(--accent) / 0.55); }
  100% { box-shadow: 0 0 0 12px rgb(var(--accent) / 0); }
}

.cs-signin {
  position: absolute;
  bottom: 1.5rem;
  right: 1.75rem;
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(var(--ink) / 0.4);
  text-decoration: none;
  transition: color 200ms ease;
}
.cs-signin:hover { color: rgb(var(--ink) / 0.85); }

@media (max-width: 640px) {
  .cs-br { display: none; }
  .cs-signin { position: static; margin-top: 2.4rem; }
}

@media (prefers-reduced-motion: reduce) {
  .cs-aurora, .cs-mark, .cs-sweep, .cs-dot, .cs-inner, .cs-count__sep {
    animation: none !important;
  }
}
`;
