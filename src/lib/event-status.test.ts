import { describe, expect, it } from "vitest";
import { getEventTiming, isEventPast } from "./event-status";

describe("event timing", () => {
  const start = "2026-07-01T09:00:00.000Z";

  it("keeps an event with no end date active indefinitely after it starts", () => {
    const timing = getEventTiming(
      { date: start },
      +new Date("2027-07-01T09:00:00.000Z"),
    );

    expect(timing.isOpenEnded).toBe(true);
    expect(timing.isLive).toBe(true);
    expect(timing.isPast).toBe(false);
    expect(timing.endMs).toBe(Number.POSITIVE_INFINITY);
  });

  it("keeps an open-ended event scheduled before its start date", () => {
    const timing = getEventTiming(
      { date: start },
      +new Date("2026-06-30T09:00:00.000Z"),
    );

    expect(timing.isLive).toBe(false);
    expect(timing.isPast).toBe(false);
  });

  it("marks an event past only after its explicit end date", () => {
    const event = {
      date: start,
      endDate: "2026-07-02T09:00:00.000Z",
    };

    expect(isEventPast(event, +new Date("2026-07-02T08:59:00.000Z"))).toBe(
      false,
    );
    expect(isEventPast(event, +new Date("2026-07-02T09:01:00.000Z"))).toBe(
      true,
    );
  });
});
