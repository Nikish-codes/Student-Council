import { describe, expect, it } from "vitest";
import { colorContrast, hasAccessibleClubTheme } from "./club-page-theme";

describe("club page themes", () => {
  it("accepts the curated template palettes", () => {
    expect(hasAccessibleClubTheme({ background: "#0b0705", foreground: "#fff5e9", accent: "#ff5a1f" })).toBe(true);
    expect(hasAccessibleClubTheme({ background: "#f1ead8", foreground: "#17130f", accent: "#d93818" })).toBe(true);
    expect(hasAccessibleClubTheme({ background: "#efffd8", foreground: "#17301e", accent: "#a92f18" })).toBe(true);
  });

  it("rejects low-contrast authored colors", () => {
    expect(colorContrast("#ffffff", "#eeeeee")).toBeLessThan(4.5);
    expect(hasAccessibleClubTheme({ background: "#ffffff", foreground: "#eeeeee" })).toBe(false);
    expect(hasAccessibleClubTheme({ background: "#ffffff", foreground: "#111111", accent: "#eeeeee" })).toBe(false);
  });
});
