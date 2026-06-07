import "server-only";
import { auth } from "@/auth";
import type { UserRole } from "@/db/schema";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  clubId: number | null;
};

/** Roles that may sign into the management panel at all. */
export const OPS_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "council_member",
  "club_lead",
  "editor",
];

/** Every role known to the system — used for role-select dropdowns. */
export const ROLES_ALL: UserRole[] = [
  "super_admin",
  "admin",
  "council_member",
  "club_lead",
  "editor",
  "viewer",
];

/** Roles that may publish (move content to `published`). */
export const PUBLISHER_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "council_member",
  "editor",
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
