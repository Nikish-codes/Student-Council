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
