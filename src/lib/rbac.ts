import "server-only";
import { auth } from "@/auth";
import type { UserRole } from "@/db/schema";
import { db } from "@/db/client";
import { clubMemberships } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  clubId: number | null;
  mustChangePassword: boolean;
};

/** Roles that may sign into the management panel at all. */
export const OPS_ROLES: UserRole[] = [
  "super_admin",
  "operations",
  "admin",
  "council_member",
  "editor",
];

/** Roles allowed to enter the panel shell. Food Committee access is then
 * constrained to /management/oval; it is deliberately not an OPS role. */
export const PANEL_ROLES: UserRole[] = [
  ...OPS_ROLES,
  "club_lead",
  "food_committee_member",
];

/** Every role known to the system — used for role-select dropdowns. */
export const ROLES_ALL: UserRole[] = [
  "super_admin",
  "operations",
  "admin",
  "food_committee_member",
  "council_member",
  "club_lead",
  "editor",
  "viewer",
];

/** Roles that may publish (move content to `published`). */
export const PUBLISHER_ROLES: UserRole[] = [
  "super_admin",
  "operations",
];

export const isAdmin = (role: UserRole) =>
  role === "super_admin" || role === "admin";

export const canPublish = (role: UserRole) => PUBLISHER_ROLES.includes(role);

/** Throwing guard: returns the session user or throws if not signed in. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id) throw new Error("UNAUTHENTICATED");
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    clubId: u.clubId ?? null,
    mustChangePassword: u.mustChangePassword ?? false,
  };
}

/** Require one of the given roles; throws FORBIDDEN otherwise. */
export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const u = await requireUser();
  if (!roles.includes(u.role)) throw new Error("FORBIDDEN");
  return u;
}

/** Require any ops role (can access the management panel). */
export const requireOps = () => requireRole(...OPS_ROLES);
export const requirePanelUser = () => requireRole(...PANEL_ROLES);
/** Club leads are excluded from general operations and may enter only their
 * assigned club editor. These guards support that editor and its media fields. */
export const requireClubManager = () => requireRole(...OPS_ROLES, "club_lead");
export async function requireMediaContributor() {
  const user = await requireUser();
  if (OPS_ROLES.includes(user.role) || user.role === "club_lead") return user;
  const membership = await db.query.clubMemberships.findFirst({
    where: and(
      eq(clubMemberships.userId, Number(user.id)),
      eq(clubMemberships.isActive, true),
      or(
        eq(clubMemberships.membershipRole, "president"),
        eq(clubMemberships.canManageMedia, true),
      ),
    ),
  });
  if (!membership) throw new Error("FORBIDDEN");
  return user;
}
export const requireOvalManager = () =>
  requireRole("super_admin", "food_committee_member");
export const requireReviewer = () => requireRole("super_admin", "operations");

/**
 * Club leads may only touch events for their own club. Admins/editors/council
 * members may touch any. Throws FORBIDDEN on violation.
 */
export function assertCanEditEvent(
  user: SessionUser,
  eventClubId: number | null,
) {
  if (user.role === "club_lead") {
    if (!user.clubId || eventClubId !== user.clubId) {
      throw new Error("FORBIDDEN");
    }
  }
}

/**
 * Club leads may only edit their own club's page. Admins/editors/council
 * members may edit any. `clubId` null means "creating a new club", which a club
 * lead may never do — they are attached to exactly one existing club.
 */
export function assertCanEditClub(user: SessionUser, clubId: number | null) {
  if (user.role === "club_lead") {
    if (!user.clubId || clubId !== user.clubId) {
      throw new Error("FORBIDDEN");
    }
  }
}
