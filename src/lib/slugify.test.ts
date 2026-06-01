import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("strips punctuation and quotes", () => {
    expect(slugify("Utopia · Esports Cup!")).toBe("utopia-esports-cup");
    expect(slugify(`O'Brien's "Gala"`)).toBe("obriens-gala");
  });
  it("collapses repeats and trims edges", () => {
    expect(slugify("  --Tech  &&  Design--  ")).toBe("tech-design");
  });
  it("caps length at 80 chars", () => {
    expect(slugify("a".repeat(200)).length).toBe(80);
  });
  it("handles empty-ish input", () => {
    expect(slugify("!!!")).toBe("");
  });
});
