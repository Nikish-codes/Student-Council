import { describe, expect, it } from "vitest";
import {
  canTransitionRevision,
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
