import { describe, it, expect } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    }
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(rateLimit(a, 1, 60_000).ok).toBe(true);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });

  it("resets after the window elapses", () => {
    const key = `win-${Math.random()}`;
    expect(rateLimit(key, 1, 1).ok).toBe(true); // 1ms window
    const start = Date.now();
    while (Date.now() - start < 3) {
      /* spin a few ms so the window passes */
    }
    expect(rateLimit(key, 1, 1).ok).toBe(true);
  });
});
