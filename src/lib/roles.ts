import type { UserRole } from "@/db/schema";

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  operations: "Operations",
  admin: "Admin",
  food_committee_member: "Food Committee Member",
  council_member: "Council Member",
  club_lead: "Club President / Lead",
  editor: "Editor",
  viewer: "Viewer",
};
