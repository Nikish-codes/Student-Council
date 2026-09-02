import type { UserRole } from "@/db/schema";

export function requiredPasswordDestination(
  mustChangePassword: boolean | undefined,
  pathname: string,
) {
  return mustChangePassword && pathname !== "/management/change-password"
    ? "/management/change-password"
    : null;
}

/** Initial destination after authentication. Role-specific workspaces take
 * priority over club memberships so narrow roles never land in Club Studio. */
export function panelHomeDestination(
  role: UserRole | undefined,
  hasClubMembership = false,
) {
  if (role === "food_committee_member") return "/management/oval";
  if (role === "sports_lead") return "/management/sports";
  if (role === "club_lead" || hasClubMembership) return "/club-management";
  return "/management";
}

/** Return the only panel destination for narrowly scoped operational roles. */
export function restrictedPanelDestination(
  role: UserRole | undefined,
  _clubId: number | null | undefined,
  pathname: string,
): string | null {
  if (role === "food_committee_member") {
    return pathname.startsWith("/management/oval") ? null : "/management/oval";
  }

  if (role === "sports_lead") {
    const destination = "/management/sports";
    return pathname === destination || pathname.startsWith(`${destination}/`)
      ? null
      : destination;
  }

  if (role === "club_lead") {
    const destination = "/club-management";
    return pathname.startsWith(destination) ? null : destination;
  }

  if (role === "operations") {
    const allowed = [
      "/management",
      "/management/approvals",
      "/management/clubs",
      "/management/events",
      "/management/recaps",
      "/management/media",
      "/eventmanagement",
    ];
    return allowed.some((prefix) =>
      prefix === "/management"
        ? pathname === prefix
        : pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
      ? null
      : "/management/approvals";
  }

  return null;
}
