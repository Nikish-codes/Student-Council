import { describe, expect, it } from "vitest";
import {
  eventMinute,
  newHalfTimeBreak,
  pauseBreak,
  readBreakClock,
  readMatchClock,
  seekBreak,
  startBreak,
} from "./sports-clock";
import type { SportMatchTimer } from "./schemas";

const NOW = 1_700_000_000_000;

function timer(partial: Partial<SportMatchTimer> = {}): SportMatchTimer {
  return {
    running: false,
    startTime: null,
    elapsedMs: 0,
    matchDuration: 90,
    stoppageTime: 0,
    ...partial,
  };
}

describe("readMatchClock", () => {
  it("returns null without a timer", () => {
    expect(readMatchClock(undefined, NOW)).toBeNull();
  });

  it("reads a paused clock from the stored offset", () => {
    const c = readMatchClock(timer({ elapsedMs: 23 * 60000 }), NOW);
    expect(c?.minute).toBe(23);
    expect(c?.label).toBe("23′");
  });

  it("advances a running clock from its start instant", () => {
    const c = readMatchClock(
      timer({ running: true, startTime: NOW - 5 * 60000, elapsedMs: 0 }),
      NOW,
    );
    expect(c?.minute).toBe(5);
  });

  it("parks on the half-time mark until restarted", () => {
    const c = readMatchClock(
      timer({ running: true, startTime: NOW - 60 * 60000, elapsedMs: 0 }),
      NOW,
    );
    expect(c?.minute).toBe(45);
  });

  it("counts past regulation as stoppage once the second half is running", () => {
    const c = readMatchClock(
      timer({
        running: true,
        startTime: NOW - 3 * 60000,
        elapsedMs: 90 * 60000,
        stoppageTime: 4,
      }),
      NOW,
    );
    expect(c?.label).toBe("90′+3");
  });

  it("parks at full time once stoppage is used up", () => {
    const c = readMatchClock(
      timer({
        running: true,
        startTime: NOW - 20 * 60000,
        elapsedMs: 90 * 60000,
        stoppageTime: 2,
      }),
      NOW,
    );
    expect(c?.label).toBe("90′+2");
    expect(c?.atFullTime).toBe(true);
  });

  it("honours a non-standard match length", () => {
    const c = readMatchClock(
      timer({ matchDuration: 40, elapsedMs: 25 * 60000 }),
      NOW,
    );
    expect(c?.minute).toBe(25);
    expect(c?.progress).toBeCloseTo(25 / 40, 5);
  });

  it("never reports negative time", () => {
    const c = readMatchClock(
      timer({ running: true, startTime: NOW + 60000, elapsedMs: 0 }),
      NOW,
    );
    expect(c?.minute).toBe(0);
  });
});

describe("eventMinute", () => {
  it.each([
    ["23'", 23],
    ["6′", 6],
    ["45+2'", 45],
    ["Q2 4:30", 2],
    ["SYS", 0],
  ])("parses %s as %i", (input, expected) => {
    expect(eventMinute(input)).toBe(expected);
  });
});

describe("half-time break", () => {
  const TEN = 10 * 60000;

  it("counts down from the configured length while paused", () => {
    const c = readBreakClock(newHalfTimeBreak(TEN), NOW);
    expect(c?.label).toBe("10:00");
    expect(c?.done).toBe(false);
    expect(c?.progress).toBe(0);
  });

  it("counts down against the wall clock once started", () => {
    const brk = startBreak(newHalfTimeBreak(TEN), NOW);
    const c = readBreakClock(brk, NOW + 3 * 60000);
    expect(c?.label).toBe("07:00");
    expect(c?.progress).toBeCloseTo(0.3, 5);
  });

  it("holds its remaining time across a pause and resume", () => {
    const started = startBreak(newHalfTimeBreak(TEN), NOW);
    const paused = pauseBreak(started, NOW + 4 * 60000);
    expect(readBreakClock(paused, NOW + 9 * 60000)?.label).toBe("06:00");

    const resumed = startBreak(paused, NOW + 9 * 60000);
    expect(readBreakClock(resumed, NOW + 10 * 60000)?.label).toBe("05:00");
  });

  it("never reports less than zero", () => {
    const brk = startBreak(newHalfTimeBreak(TEN), NOW);
    const c = readBreakClock(brk, NOW + 60 * 60000);
    expect(c?.remainingMs).toBe(0);
    expect(c?.label).toBe("00:00");
    expect(c?.done).toBe(true);
  });

  it("jumps to a given remaining time, running or not", () => {
    const paused = seekBreak(newHalfTimeBreak(TEN), 90_000, NOW);
    expect(readBreakClock(paused, NOW)?.label).toBe("01:30");

    const running = seekBreak(startBreak(newHalfTimeBreak(TEN), NOW), 90_000, NOW);
    expect(readBreakClock(running, NOW + 30_000)?.label).toBe("01:00");
  });

  it("clamps a negative jump to zero", () => {
    const brk = seekBreak(newHalfTimeBreak(TEN), -5000, NOW);
    expect(readBreakClock(brk, NOW)?.label).toBe("00:00");
  });

  it("returns null without a break", () => {
    expect(readBreakClock(undefined, NOW)).toBeNull();
  });
});
