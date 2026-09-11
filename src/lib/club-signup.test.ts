import { describe, expect, it } from "vitest";
import { matchesClubSearch, registrationLink } from "./club-signup";

describe("club signup directory", () => {
  it("never offers placeholder or unsafe registration links", () => {
    expect(registrationLink("https://forms.gle/example-tech")).toBeUndefined();
    expect(registrationLink("javascript:alert(1)")).toBeUndefined();
    expect(registrationLink(null)).toBeUndefined();
    expect(registrationLink("https://forms.cloud.microsoft/r/waFGtXFNVu")).toBe(
      "https://forms.cloud.microsoft/r/waFGtXFNVu",
    );
  });
  it("finds clubs using names, abbreviations, or interests across words", () => {
    const club = {
      name: "WFC (Woxsen Fashion Club)",
      slug: "fashion-design",
      blurb: "Explore styling and modelling.",
      tags: ["Design"],
    };
    expect(matchesClubSearch(club, " WFC ")).toBe(true);
    expect(matchesClubSearch(club, "fashion design")).toBe(true);
    expect(matchesClubSearch(club, "modelling")).toBe(true);
    expect(matchesClubSearch(club, "football")).toBe(false);
    expect(matchesClubSearch(club, "")).toBe(true);
  });
});
