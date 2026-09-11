import { describe, expect, it } from "vitest";

import {
  CLUB_APPLY_LIMIT,
  clubApplyState,
  parseClubApplies,
} from "@/lib/club-signup";

const entry = (slug: string, at = 0) => ({
  slug,
  name: `Club ${slug}`,
  at,
});

describe("parseClubApplies", () => {
  it("returns entries for a valid array", () => {
    expect(parseClubApplies([entry("a"), entry("b", 1)])).toEqual([
      entry("a"),
      entry("b", 1),
    ]);
  });

  it("returns empty for non-array input", () => {
    expect(parseClubApplies(null)).toEqual([]);
    expect(parseClubApplies("nope")).toEqual([]);
    expect(parseClubApplies({ slug: "a" })).toEqual([]);
  });

  it("drops entries missing a slug or name", () => {
    expect(
      parseClubApplies([{ slug: "", name: "x" }, { slug: "a" }, entry("b")]),
    ).toEqual([entry("b")]);
  });

  it("dedupes by slug keeping the first occurrence", () => {
    expect(parseClubApplies([entry("a", 1), entry("a", 2)])).toEqual([
      entry("a", 1),
    ]);
  });

  it("caps entries at the apply limit", () => {
    const many = ["a", "b", "c", "d", "e"].map((slug) => entry(slug));
    const parsed = parseClubApplies(many);
    expect(parsed).toHaveLength(CLUB_APPLY_LIMIT);
    expect(parsed.map((item) => item.slug)).toEqual(["a", "b", "c"]);
  });

  it("tolerates a missing timestamp", () => {
    expect(parseClubApplies([{ slug: "a", name: "Club a" }])).toEqual([
      { slug: "a", name: "Club a", at: 0 },
    ]);
  });
});

describe("clubApplyState", () => {
  const applies = [entry("a"), entry("b"), entry("c")];

  it("marks already-applied clubs as applied even at the limit", () => {
    expect(clubApplyState(applies, "b")).toBe("applied");
  });

  it("blocks other clubs once the limit is reached", () => {
    expect(clubApplyState(applies, "d")).toBe("blocked");
  });

  it("leaves clubs open below the limit", () => {
    expect(clubApplyState([entry("a")], "d")).toBe("open");
    expect(clubApplyState([], "d")).toBe("open");
  });
});
