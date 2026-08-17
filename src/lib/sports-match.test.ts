import { describe, expect, it } from "vitest";
import {
  formatSportsMatchDate,
  formatSportsMatchTime,
  getSportsMatchMonthKey,
  getSportsMatchYear,
  parseSportsMatchDate,
} from "./sports-match";

describe("sports match dates", () => {
  it("treats datetime-local values as campus time", () => {
    expect(parseSportsMatchDate("2026-08-14T18:30")?.toISOString()).toBe(
      "2026-08-14T13:00:00.000Z",
    );
    expect(formatSportsMatchDate("2026-08-14T18:30")).toContain("14 Aug");
    expect(formatSportsMatchTime("2026-08-14T18:30")).toBe("6:30 pm");
  });

  it("keeps explicit timezone values intact", () => {
    expect(parseSportsMatchDate("2026-08-14T13:00:00Z")?.toISOString()).toBe(
      "2026-08-14T13:00:00.000Z",
    );
  });

  it("returns stable year and month keys", () => {
    expect(getSportsMatchYear("2027-01-09T09:00")).toBe(2027);
    expect(getSportsMatchMonthKey("2027-01-09T09:00")).toBe("2027-01");
  });

  it("handles missing and invalid values", () => {
    expect(parseSportsMatchDate("not-a-date")).toBeUndefined();
    expect(formatSportsMatchDate()).toBe("Date to be announced");
    expect(formatSportsMatchTime()).toBeUndefined();
  });
});
