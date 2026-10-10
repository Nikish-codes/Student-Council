"use client";

import { useEffect, useState } from "react";
import type { SportMatchTimer } from "@/lib/schemas";

export type MatchClock = {
  elapsedMs: number;
  minute: number;
  label: string;
  stoppage: number;
  progress: number;
  atHalfTime: boolean;
  atFullTime: boolean;
};

export function readMatchClock(
  timer: SportMatchTimer | undefined,
  now: number,
): MatchClock | null {
  if (!timer) return null;

  const duration = (timer.matchDuration || 90) * 60000;
  const half = duration / 2;
  const stoppage = timer.stoppageTime || 0;
  const full = duration + stoppage * 60000;

  let elapsed = timer.elapsedMs;
  if (timer.running && timer.startTime) {
    elapsed = now - timer.startTime + timer.elapsedMs;
  }
  if (timer.elapsedMs < half && elapsed >= half) elapsed = half;
  if (timer.elapsedMs >= half && elapsed >= full) elapsed = full;
  elapsed = Math.max(0, elapsed);

  const minute = Math.floor(elapsed / 60000);
  const regulation = Math.floor(duration / 60000);
  const over = minute - regulation;

  return {
    elapsedMs: elapsed,
    minute,
    label: over > 0 ? `${regulation}′+${over}` : `${Math.max(1, minute)}′`,
    stoppage,
    progress: Math.min(1, elapsed / (duration || 1)),
    atHalfTime: elapsed === half && !timer.running,
    atFullTime: elapsed >= full,
  };
}

export function useMatchClock(timer: SportMatchTimer | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer]);

  return readMatchClock(timer, now);
}

export function eventMinute(time: string): number {
  const m = time.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}
