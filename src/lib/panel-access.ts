import type { UserRole } from "@/db/schema";

/** Return the only panel destination for narrowly scoped operational roles. */
export function restrictedPanelDestination(
  role: UserRole | undefined,
  clubId: number | null | undefined,
  pathname: string,
): string | null {
  if (role === "food_committee_member") {
    return pathname.startsWith("/management/oval") ? null : "/management/oval";
  }

  if (role === "club_lead") {
    const destination = clubId
      ? `/management/clubs/${clubId}`
      : "/management/clubs";
    return pathname === destination || pathname === `${destination}/`
      ? null
      : destination;
  }

  return null;
}
