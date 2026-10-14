"use client";

import { useEffect, useState } from "react";
import type { SportHalfTimeBreak, SportMatchTimer } from "@/lib/schemas";

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

export const DEFAULT_HALF_TIME_MS = 10 * 60000;

export type BreakClock = {
  remainingMs: number;
  minutes: number;
  seconds: number;
  label: string;
  done: boolean;
  progress: number;
};

export function readBreakClock(
  brk: SportHalfTimeBreak | undefined,
  now: number,
): BreakClock | null {
  if (!brk) return null;

  const remaining =
    brk.running && brk.endsAt !== null
      ? Math.max(0, brk.endsAt - now)
      : Math.max(0, brk.remainingMs);

  const total = Math.ceil(remaining / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const duration = brk.durationMs > 0 ? brk.durationMs : DEFAULT_HALF_TIME_MS;

  return {
    remainingMs: remaining,
    minutes,
    seconds,
    label: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    done: remaining <= 0,
    progress: Math.min(1, Math.max(0, 1 - remaining / duration)),
  };
}

export function newHalfTimeBreak(durationMs: number): SportHalfTimeBreak {
  return {
    running: false,
    endsAt: null,
    remainingMs: durationMs,
    durationMs,
  };
}

export function startBreak(
  brk: SportHalfTimeBreak,
  now: number,
): SportHalfTimeBreak {
  return { ...brk, running: true, endsAt: now + Math.max(0, brk.remainingMs) };
}

export function pauseBreak(
  brk: SportHalfTimeBreak,
  now: number,
): SportHalfTimeBreak {
  const remaining =
    brk.running && brk.endsAt !== null
      ? Math.max(0, brk.endsAt - now)
      : Math.max(0, brk.remainingMs);
  return { ...brk, running: false, endsAt: null, remainingMs: remaining };
}

export function seekBreak(
  brk: SportHalfTimeBreak,
  remainingMs: number,
  now: number,
): SportHalfTimeBreak {
  const clamped = Math.max(0, remainingMs);
  return brk.running
    ? { ...brk, endsAt: now + clamped, remainingMs: clamped }
    : { ...brk, endsAt: null, remainingMs: clamped };
}

export function useBreakClock(brk: SportHalfTimeBreak | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!brk) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [brk]);

  return readBreakClock(brk, now);
}
