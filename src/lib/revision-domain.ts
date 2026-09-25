import type { RevisionStatus } from "@/db/schema";

export type RevisionAction =
  | "save"
  | "submit"
  | "request_changes"
  | "approve"
  | "decline"
  | "withdraw";

const TRANSITIONS: Record<RevisionAction, RevisionStatus[]> = {
  save: ["draft"],
  submit: ["draft", "changes_requested"],
  request_changes: ["pending_review"],
  approve: ["pending_review"],
  decline: ["pending_review"],
  withdraw: ["pending_review"],
};

export function canTransitionRevision(
  status: RevisionStatus,
  action: RevisionAction,
) {
  return TRANSITIONS[action].includes(status);
}

export function assertRevisionTransition(
  status: RevisionStatus,
  action: RevisionAction,
) {
  if (!canTransitionRevision(status, action)) {
    throw new Error(`INVALID_REVISION_TRANSITION:${status}:${action}`);
  }
}

export function hasApprovedFollowupMedia(snapshot: {
  photoMediaIds?: unknown;
  videoLinks?: unknown;
}) {
  const photos = Array.isArray(snapshot.photoMediaIds)
    ? snapshot.photoMediaIds.filter((id) => Number.isSafeInteger(Number(id)))
    : [];
  const videos = Array.isArray(snapshot.videoLinks)
    ? snapshot.videoLinks.filter(
        (url) => typeof url === "string" && url.trim().length > 0,
      )
    : [];
  return photos.length > 0 || videos.length > 0;
}

export function isRevisionStale(baseVersion: number, currentVersion: number) {
  return baseVersion !== currentVersion;
}

/**
 * Fields that require manual review when changed on a club page.
 * Everything else is cosmetic and can be auto-approved.
 */
export const STRUCTURAL_CLUB_PAGE_FIELDS: ReadonlySet<string> = new Set([
  "name",
  "people",
]);

export type ChangeSeverity = "cosmetic" | "structural";

/**
 * Compare a proposed club-page snapshot against the current baseline.
 * Returns `"structural"` if any high-visibility field changed, otherwise `"cosmetic"`.
 * If the baseline is null (first submission), it's always structural.
 */
export function classifyClubPageChangeSeverity(
  baseline: Record<string, unknown> | null,
  proposed: Record<string, unknown>,
): ChangeSeverity {
  if (!baseline) return "structural";
  const keys = new Set([...Object.keys(baseline), ...Object.keys(proposed)]);
  for (const key of keys) {
    if (
      JSON.stringify(baseline[key] ?? null) !==
      JSON.stringify(proposed[key] ?? null)
    ) {
      if (STRUCTURAL_CLUB_PAGE_FIELDS.has(key)) return "structural";
    }
  }
  return "cosmetic";
}
