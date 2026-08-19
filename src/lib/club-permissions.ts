import type { DbClubMembership } from "@/db/schema";

export type ClubPermission =
  | "edit_page"
  | "manage_events"
  | "manage_media"
  | "manage_team";

export function membershipAllows(
  membership: Pick<
    DbClubMembership,
    | "membershipRole"
    | "canEditPage"
    | "canManageEvents"
    | "canManageMedia"
    | "isActive"
  >,
  permission: ClubPermission,
) {
  if (!membership.isActive) return false;
  if (membership.membershipRole === "president") return true;
  if (permission === "edit_page") return membership.canEditPage;
  if (permission === "manage_events") return membership.canManageEvents;
  if (permission === "manage_media") return membership.canManageMedia;
  return false;
}
