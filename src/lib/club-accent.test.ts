import { describe, expect, it } from "vitest";
import { accentChannels, normalizeAccent } from "./club-accent";

/**
 * The accent colour is authored in the management panel and interpolated into a
 * `style` attribute on the public club page. That makes it the one piece of
 * club content that can do damage if it isn't constrained — hence a hard
 * allowlist (6-digit hex, nothing else) rather than a blocklist of bad strings.
 */
describe("normalizeAccent", () => {
  it("accepts a 6-digit hex and lowercases it", () => {
    expect(normalizeAccent("#EE495C")).toBe("#ee495c");
    expect(normalizeAccent("#0a0b0c")).toBe("#0a0b0c");
  });

  it("tolerates surrounding whitespace from a paste", () => {
    expect(normalizeAccent("  #ee495c \n")).toBe("#ee495c");
  });

  it.each([
    ["", "empty"],
    ["   ", "whitespace only"],
    ["ee495c", "missing #"],
    ["#fff", "3-digit shorthand"],
    ["#ee495cff", "8-digit with alpha"],
    ["#gggggg", "non-hex characters"],
    ["red", "named colour"],
    ["rgb(238, 73, 92)", "functional notation"],
  ])("rejects %s (%s)", (input) => {
    expect(normalizeAccent(input)).toBeUndefined();
  });

  it("rejects CSS injection attempts", () => {
    // Each of these would break out of the custom-property declaration if it
    // were echoed into the style attribute verbatim.
    expect(normalizeAccent("red; background: url(https://evil.example/x)")).toBeUndefined();
    expect(normalizeAccent("#ee495c; position: fixed; inset: 0")).toBeUndefined();
    expect(normalizeAccent('#ee495c" onload="alert(1)')).toBeUndefined();
    expect(normalizeAccent("expression(alert(1))")).toBeUndefined();
    expect(normalizeAccent("</style><script>alert(1)</script>")).toBeUndefined();
  });

  it("handles null and undefined", () => {
    expect(normalizeAccent(null)).toBeUndefined();
    expect(normalizeAccent(undefined)).toBeUndefined();
  });
});

describe("accentChannels", () => {
  it("splits a hex into the space-separated RGB triple Tailwind expects", () => {
    // globals.css declares every colour as channels so `rgb(var(--x) / 0.5)`
    // works; returning a hex here would silently break every alpha usage.
    expect(accentChannels("#ee495c")).toBe("238 73 92");
    expect(accentChannels("#000000")).toBe("0 0 0");
    expect(accentChannels("#ffffff")).toBe("255 255 255");
  });

  it("is case-insensitive", () => {
    expect(accentChannels("#EE495C")).toBe(accentChannels("#ee495c"));
  });

  it("returns undefined for anything the validator rejects", () => {
    expect(accentChannels("red")).toBeUndefined();
    expect(accentChannels("#fff")).toBeUndefined();
    expect(accentChannels(null)).toBeUndefined();
  });
});
