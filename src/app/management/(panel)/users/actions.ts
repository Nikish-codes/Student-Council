"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { db } from "@/db/client";
import {
  users as t,
  type UserRole,
  auditLog,
  contentRevisions,
  clubs,
  clubMemberships,
  events,
  ovalMenuDays,
  attendees,
} from "@/db/schema";
import { requireUser, requireRole, ROLES_ALL } from "@/lib/rbac";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const norm = (e: string) => e.toLowerCase();

function bust() {
  revalidatePath("/management/users");
}

export type UserActionState = {
  error?: string;
};

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
  // Oval managers and super admins are both protected from normal admins.
  return targetRole !== "super_admin" && targetRole !== "food_committee_member";
}

function canAssignRole(actorRole: UserRole, requestedRole: UserRole): boolean {
  if (actorRole === "super_admin") return true;
  return requestedRole !== "super_admin" && requestedRole !== "food_committee_member";
}

export async function createUser(
  prevState: UserActionState | undefined,
  fd: FormData
): Promise<UserActionState | undefined> {
  const { actor } = await requireUserManager();

  const name = s(fd, "name");
  const email = norm(s(fd, "email"));
  const password = String(fd.get("password") ?? "");
  const role = s(fd, "role") as UserRole;
  const clubId = s(fd, "clubId") ? Number(s(fd, "clubId")) : null;

  if (!name || !email || !password) {
    return { error: "Name, email, and password are required" };
  }
  if (!ROLES_ALL.includes(role)) {
    return { error: "Invalid role selected" };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }
  if (!canAssignRole(actor.role, role)) {
    return { error: "You cannot assign this role" };
  }

  const exists = await db.query.users.findFirst({ where: eq(t.email, email) });
  if (exists) {
    return { error: "A user with this email already exists" };
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await db.insert(t).values({
      name,
      email,
      password: hash,
      role,
      clubId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create user";
    console.error("Failed to create user:", err);
    return { error: message };
  }

  bust();
  redirect("/management/users");
}

export async function updateUser(
  id: number,
  prevState: UserActionState | undefined,
  fd: FormData
): Promise<UserActionState | undefined> {
  const { actor } = await requireUserManager();
  const me = await requireUser();

  const target = await db.query.users.findFirst({ where: eq(t.id, id) });
  if (!target) {
    return { error: "User not found" };
  }
  if (!canActOn(actor.role, target.role)) {
    return { error: "You cannot edit this user" };
  }

  const name = s(fd, "name");
  const email = norm(s(fd, "email"));
  const requestedRole = s(fd, "role") as UserRole;
  const clubId = s(fd, "clubId") ? Number(s(fd, "clubId")) : null;
  const newPassword = String(fd.get("password") ?? "");

  if (!name || !email) {
    return { error: "Name and email are required" };
  }
  if (!ROLES_ALL.includes(requestedRole)) {
    return { error: "Invalid role selected" };
  }

  // Self-protection: cannot demote / change your own role.
  const isSelf = String(target.id) === me.id;
  const role = isSelf ? target.role : requestedRole;
  if (!isSelf && !canAssignRole(actor.role, role)) {
    return { error: "You cannot assign this role" };
  }

  // Email uniqueness if changed.
  if (email !== target.email) {
    const dupe = await db.query.users.findFirst({ where: eq(t.email, email) });
    if (dupe && dupe.id !== id) {
      return { error: "A user with this email already exists" };
    }
  }

  const patch: Record<string, unknown> = {
    name,
    email,
    role,
    clubId,
    updatedAt: new Date().toISOString(),
  };

  if (newPassword) {
    if (newPassword.length < 6) {
      return { error: "Password must be at least 6 characters" };
    }
    patch.password = await bcrypt.hash(newPassword, 10);
    // Resetting the password also clears any active lockout.
    patch.failedLoginCount = 0;
    patch.lockedUntil = null;
  }

  try {
    await db.update(t).set(patch).where(eq(t.id, id));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update user";
    console.error("Failed to update user:", err);
    return { error: message };
  }

  bust();
  redirect("/management/users");
}

export async function deleteUser(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const { actor } = await requireUserManager();
    const me = await requireUser();
    if (String(id) === me.id) {
      return { ok: false, error: "You cannot delete your own account" };
    }

    const target = await db.query.users.findFirst({ where: eq(t.id, id) });
    if (!target) {
      return { ok: false, error: "User not found" };
    }
    if (!canActOn(actor.role, target.role)) {
      return { ok: false, error: "You cannot delete this user" };
    }

    // Cleanly clear or reassign foreign key dependencies before deleting the user
    await db.transaction(async (tx) => {
      // 1. Audit logs: set actor to null to keep record history
      await tx
        .update(auditLog)
        .set({ actorUserId: null })
        .where(eq(auditLog.actorUserId, id));

      // 2. Content revisions: clear reviewer and reassign authorship to acting admin
      await tx
        .update(contentRevisions)
        .set({ reviewedByUserId: null })
        .where(eq(contentRevisions.reviewedByUserId, id));
      await tx
        .update(contentRevisions)
        .set({ authorUserId: Number(actor.id) })
        .where(eq(contentRevisions.authorUserId, id));

      // 3. Clubs lead reference
      await tx
        .update(clubs)
        .set({ leadId: null })
        .where(eq(clubs.leadId, id));

      // 4. Club memberships
      await tx
        .delete(clubMemberships)
        .where(eq(clubMemberships.userId, id));
      await tx
        .update(clubMemberships)
        .set({ invitedByUserId: null })
        .where(eq(clubMemberships.invitedByUserId, id));
      await tx
        .update(clubMemberships)
        .set({ revokedByUserId: null })
        .where(eq(clubMemberships.revokedByUserId, id));

      // 5. Events organizer reference
      await tx
        .update(events)
        .set({ organizerId: null })
        .where(eq(events.organizerId, id));

      // 6. Oval menu days
      await tx
        .update(ovalMenuDays)
        .set({ importedByUserId: null })
        .where(eq(ovalMenuDays.importedByUserId, id));
      await tx
        .update(ovalMenuDays)
        .set({ approvedByUserId: null })
        .where(eq(ovalMenuDays.approvedByUserId, id));

      // 7. Attendees checked-in by user
      await tx
        .update(attendees)
        .set({ checkedInByUserId: null })
        .where(eq(attendees.checkedInByUserId, id));

      // 8. Finally delete the user row safely
      await tx.delete(t).where(eq(t.id, id));
    });

    bust();
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete user";
    console.error("Failed to delete user:", err);
    return { ok: false, error: message };
  }
}

/** Clear the lockout + failed-attempt counter without touching the password. */
export async function unlockUser(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const { actor } = await requireUserManager();
    const target = await db.query.users.findFirst({ where: eq(t.id, id) });
    if (!target) return { ok: false, error: "User not found" };
    if (!canActOn(actor.role, target.role)) {
      return { ok: false, error: "You cannot unlock this user" };
    }
    await db
      .update(t)
      .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: new Date().toISOString() })
      .where(eq(t.id, id));
    bust();
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to unlock user";
    console.error("Failed to unlock user:", err);
    return { ok: false, error: message };
  }
}
