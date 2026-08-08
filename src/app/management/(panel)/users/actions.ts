"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { db } from "@/db/client";
import { users as t, type UserRole } from "@/db/schema";
import { requireUser, requireRole, ROLES_ALL } from "@/lib/rbac";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const norm = (e: string) => e.toLowerCase();

function bust() {
  revalidatePath("/management/users");
}

/**
 * RBAC for user management:
 * - super_admin can manage anyone (including other super_admins) and assign any role.
 * - admin can manage everyone EXCEPT super_admins and cannot assign super_admin.
 * - No one can change their own role or delete themselves (footgun guard).
 */
async function requireUserManager(): Promise<{
  actor: { id: string; role: UserRole };
}> {
  const actor = await requireRole("super_admin", "admin");
  return { actor: { id: actor.id, role: actor.role } };
}

function canActOn(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === "super_admin") return true;
  // admin cannot touch super_admin rows.
  return targetRole !== "super_admin";
}

function canAssignRole(actorRole: UserRole, requestedRole: UserRole): boolean {
  if (actorRole === "super_admin") return true;
  return requestedRole !== "super_admin";
}

export async function createUser(fd: FormData) {
  const { actor } = await requireUserManager();

  const name = s(fd, "name");
  const email = norm(s(fd, "email"));
  const password = String(fd.get("password") ?? "");
  const role = s(fd, "role") as UserRole;
  const clubId = s(fd, "clubId") ? Number(s(fd, "clubId")) : null;

  if (!name || !email || !password) throw new Error("Name, email, and password are required");
  if (!ROLES_ALL.includes(role)) throw new Error("Invalid role");
  if (password.length < 10) throw new Error("Password must be at least 10 characters");
  if (!canAssignRole(actor.role, role)) {
    throw new Error("You cannot assign this role");
  }

  const exists = await db.query.users.findFirst({ where: eq(t.email, email) });
  if (exists) throw new Error("A user with this email already exists");

  const hash = await bcrypt.hash(password, 10);
  await db.insert(t).values({
    name,
    email,
    password: hash,
    role,
    clubId,
  });

  bust();
  redirect("/management/users");
}

export async function updateUser(id: number, fd: FormData) {
  const { actor } = await requireUserManager();
  const me = await requireUser();

  const target = await db.query.users.findFirst({ where: eq(t.id, id) });
  if (!target) throw new Error("User not found");
  if (!canActOn(actor.role, target.role)) {
    throw new Error("You cannot edit this user");
  }

  const name = s(fd, "name");
  const email = norm(s(fd, "email"));
  const requestedRole = s(fd, "role") as UserRole;
  const clubId = s(fd, "clubId") ? Number(s(fd, "clubId")) : null;
  const newPassword = String(fd.get("password") ?? "");

  if (!name || !email) throw new Error("Name and email are required");
  if (!ROLES_ALL.includes(requestedRole)) throw new Error("Invalid role");

  // Self-protection: cannot demote / change your own role.
  const isSelf = String(target.id) === me.id;
  const role = isSelf ? target.role : requestedRole;
  if (!isSelf && !canAssignRole(actor.role, role)) {
    throw new Error("You cannot assign this role");
  }

  // Email uniqueness if changed.
  if (email !== target.email) {
    const dupe = await db.query.users.findFirst({ where: eq(t.email, email) });
    if (dupe && dupe.id !== id) throw new Error("A user with this email already exists");
  }

  const patch: Record<string, unknown> = {
    name,
    email,
    role,
    clubId,
    updatedAt: new Date().toISOString(),
  };

  if (newPassword) {
    if (newPassword.length < 10) throw new Error("Password must be at least 10 characters");
    patch.password = await bcrypt.hash(newPassword, 10);
    // Resetting the password also clears any active lockout.
    patch.failedLoginCount = 0;
    patch.lockedUntil = null;
  }

  await db.update(t).set(patch).where(eq(t.id, id));
  bust();
  redirect("/management/users");
}

export async function deleteUser(id: number) {
  const { actor } = await requireUserManager();
  const me = await requireUser();
  if (String(id) === me.id) throw new Error("You cannot delete your own account");

  const target = await db.query.users.findFirst({ where: eq(t.id, id) });
  if (!target) return;
  if (!canActOn(actor.role, target.role)) {
    throw new Error("You cannot delete this user");
  }

  await db.delete(t).where(eq(t.id, id));
  bust();
}

/** Clear the lockout + failed-attempt counter without touching the password. */
export async function unlockUser(id: number) {
  const { actor } = await requireUserManager();
  const target = await db.query.users.findFirst({ where: eq(t.id, id) });
  if (!target) return;
  if (!canActOn(actor.role, target.role)) {
    throw new Error("You cannot unlock this user");
  }
  await db
    .update(t)
    .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: new Date().toISOString() })
    .where(eq(t.id, id));
  bust();
}
