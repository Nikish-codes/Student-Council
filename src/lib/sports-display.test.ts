import { describe, expect, it } from "vitest";
import {
  TEAM_A_COLOR,
  TEAM_B_COLOR,
  celebrationMs,
  eventKey,
  eventLabel,
  teamColor,
} from "./sports-display";

const EIGHT_DIGIT_HEX = /^#[0-9a-f]{8}$/i;

describe("teamColor", () => {
  it("defaults to the home and away accents", () => {
    expect(teamColor("a")).toBe(TEAM_A_COLOR);
    expect(teamColor("b")).toBe(TEAM_B_COLOR);
  });

  it("accepts a hex override", () => {
    expect(teamColor("a", "#ff0000")).toBe("#ff0000");
    expect(teamColor("b", "#0f0")).toBe("#0f0");
  });

  it("falls back when an override is not hex", () => {
    expect(teamColor("a", "hsl(205 85% 62%)")).toBe(TEAM_A_COLOR);
    expect(teamColor("b", "rebeccapurple")).toBe(TEAM_B_COLOR);
    expect(teamColor("a", "")).toBe(TEAM_A_COLOR);
  });

  it("always yields a colour that stays valid with an alpha suffix", () => {
    for (const value of [
      teamColor("a"),
      teamColor("b"),
      teamColor("a", "#112233"),
      teamColor("b", "not a colour"),
    ]) {
      expect(`${value}66`).toMatch(EIGHT_DIGIT_HEX);
    }
  });
});

describe("eventKey", () => {
  it("prefers the stored id", () => {
    expect(
      eventKey({ id: "abc", time: "5'", team: "a", type: "goal" }, 0),
    ).toBe("abc");
  });

  it("derives a stable key for events logged before ids existed", () => {
    const legacy = { time: "5'", team: "a" as const, type: "goal" };
    expect(eventKey(legacy, 2)).toBe(eventKey(legacy, 2));
    expect(eventKey(legacy, 2)).not.toBe(eventKey(legacy, 3));
  });
});

describe("celebrationMs", () => {
  it("uses the card duration for bookings", () => {
    expect(
      celebrationMs({ time: "5'", team: "a", type: "red" }, "takeover"),
    ).toBe(5400);
  });

  it("honours a per-event style over the match default", () => {
    const flourish = celebrationMs(
      { time: "5'", team: "a", type: "goal", style: "flourish" },
      "takeover",
    );
    const takeover = celebrationMs(
      { time: "5'", team: "a", type: "goal" },
      "takeover",
    );
    expect(flourish).toBeLessThan(takeover);
  });
});

describe("eventLabel", () => {
  it("names known types and humanises unknown ones", () => {
    expect(eventLabel("second_yellow")).toBe("Second yellow");
    expect(eventLabel("swap_display")).toBe("swap display");
  });
});
