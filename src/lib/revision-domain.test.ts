import { describe, expect, it } from "vitest";
import {
  canTransitionRevision,
  classifyClubPageChangeSeverity,
  hasApprovedFollowupMedia,
  isRevisionStale,
} from "./revision-domain";

describe("revision workflow", () => {
  it("keeps submitted snapshots immutable", () => {
    expect(canTransitionRevision("draft", "save")).toBe(true);
    expect(canTransitionRevision("pending_review", "save")).toBe(false);
    expect(canTransitionRevision("approved", "submit")).toBe(false);
  });

  it("supports request changes, decline, withdrawal, and approval", () => {
    expect(canTransitionRevision("pending_review", "request_changes")).toBe(true);
    expect(canTransitionRevision("pending_review", "decline")).toBe(true);
    expect(canTransitionRevision("pending_review", "withdraw")).toBe(true);
    expect(canTransitionRevision("pending_review", "approve")).toBe(true);
  });

  it("rejects a revision when the public version moved", () => {
    expect(isRevisionStale(4, 5)).toBe(true);
    expect(isRevisionStale(5, 5)).toBe(false);
  });

  it("completes follow-up only with a photo or video", () => {
    expect(hasApprovedFollowupMedia({ photoMediaIds: [], videoLinks: [] })).toBe(false);
    expect(hasApprovedFollowupMedia({ photoMediaIds: [12], videoLinks: [] })).toBe(true);
    expect(hasApprovedFollowupMedia({ photoMediaIds: [], videoLinks: ["https://youtu.be/example"] })).toBe(true);
  });
});

describe("classifyClubPageChangeSeverity", () => {
  const baseline: Record<string, unknown> = {
    name: "Test Club",
    blurb: "A test club",
    tagline: "Testing",
    about: "About text",
    logoId: 1,
    coverId: 2,
    people: [{ name: "Alice", role: "Lead" }],
    pageTheme: { background: "#000", foreground: "#fff", accent: "#f00" },
  };

  it("returns 'cosmetic' when only text and images change", () => {
    const proposed = { ...baseline, blurb: "Updated blurb", logoId: 99, tagline: "New tagline" };
    expect(classifyClubPageChangeSeverity(baseline, proposed)).toBe("cosmetic");
  });

  it("returns 'cosmetic' when theme colors change", () => {
    const proposed = { ...baseline, pageTheme: { background: "#111", foreground: "#eee", accent: "#0f0" } };
    expect(classifyClubPageChangeSeverity(baseline, proposed)).toBe("cosmetic");
  });

  it("returns 'structural' when name changes", () => {
    const proposed = { ...baseline, name: "Renamed Club" };
    expect(classifyClubPageChangeSeverity(baseline, proposed)).toBe("structural");
  });

  it("returns 'structural' when people roster changes", () => {
    const proposed = { ...baseline, people: [{ name: "Bob", role: "VP" }] };
    expect(classifyClubPageChangeSeverity(baseline, proposed)).toBe("structural");
  });

  it("returns 'structural' when baseline is null (first submission)", () => {
    expect(classifyClubPageChangeSeverity(null, baseline)).toBe("structural");
  });

  it("returns 'cosmetic' when nothing changed", () => {
    expect(classifyClubPageChangeSeverity(baseline, { ...baseline })).toBe("cosmetic");
  });

  it("returns 'structural' when a structural field is added to an empty baseline", () => {
    const empty = { blurb: "test", tagline: null };
    const proposed = { ...empty, name: "New", people: [] };
    expect(classifyClubPageChangeSeverity(empty, proposed)).toBe("structural");
  });
});
