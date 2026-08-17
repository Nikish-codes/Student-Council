"use client";

import * as React from "react";

const TAP_WINDOW_MS = 3_000;
const DISPLAY_MS = 7_000;
const EXIT_MS = 300;

export function NikishEasterEgg() {
  const tapCount = React.useRef(0);
  const lastTapAt = React.useRef(0);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const [revealKey, setRevealKey] = React.useState(0);

  const clearTimers = React.useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (removeTimer.current) clearTimeout(removeTimer.current);
    hideTimer.current = null;
    removeTimer.current = null;
  }, []);

  const dismiss = React.useCallback(() => {
    clearTimers();
    setLeaving(true);
    removeTimer.current = setTimeout(() => {
      setVisible(false);
      setLeaving(false);
    }, EXIT_MS);
  }, [clearTimers]);

  React.useEffect(() => clearTimers, [clearTimers]);

  function reveal() {
    clearTimers();
    setRevealKey((current) => current + 1);
    setLeaving(false);
    setVisible(true);
    hideTimer.current = setTimeout(dismiss, DISPLAY_MS);
  }

  function countTap() {
    const now = performance.now();
    if (now - lastTapAt.current > TAP_WINDOW_MS) tapCount.current = 0;
    lastTapAt.current = now;
    tapCount.current += 1;

    if (tapCount.current === 5) {
      tapCount.current = 0;
      reveal();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={countTap}
        className="rounded-sm text-inherit outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        Nikish
      </button>

      {visible ? (
        <button
          key={revealKey}
          type="button"
          onClick={dismiss}
          aria-label="Hide Manya"
          className={`fixed bottom-20 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center outline-none motion-reduce:animate-none ${
            leaving
              ? "animate-out fade-out zoom-out-90 slide-out-to-bottom-4 duration-300 fill-mode-forwards"
              : "animate-in fade-in zoom-in-75 slide-in-from-bottom-6 duration-500"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- animated local GIF */}
          <img
            src="/images/ambient-7f31.gif"
            alt=""
            width={128}
            height={128}
            className="h-36 w-36 rounded-3xl bg-white object-cover shadow-[0_20px_60px_rgba(0,0,0,0.35)] motion-reduce:hidden sm:h-40 sm:w-40"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- local reduced-motion fallback */}
          <img
            src="/images/ambient-7f31-still.png"
            alt=""
            width={128}
            height={128}
            className="hidden h-36 w-36 rounded-3xl bg-white object-cover shadow-[0_20px_60px_rgba(0,0,0,0.35)] motion-reduce:block sm:h-40 sm:w-40"
          />
          <span className="display mt-3 text-3xl font-semibold text-ink drop-shadow-md sm:text-4xl">
            Manya
          </span>
        </button>
      ) : null}
    </>
  );
}
