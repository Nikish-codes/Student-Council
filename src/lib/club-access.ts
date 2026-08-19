import "server-only";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  auditLog,
  clubMemberships,
  clubs,
  users,
  type DbClubMembership,
} from "@/db/schema";
import { requireUser, type SessionUser } from "@/lib/rbac";
import { newId } from "@/lib/tickets";
import { membershipAllows, type ClubPermission } from "@/lib/club-permissions";

export async function getUserClubMemberships(userId: number) {
  return db.query.clubMemberships.findMany({
    where: and(
      eq(clubMemberships.userId, userId),
      eq(clubMemberships.isActive, true),
    ),
    with: { club: true },
  });
}

export async function requireClubMembership(
  clubId: number,
  permission?: ClubPermission,
): Promise<{ user: SessionUser; membership: DbClubMembership }> {
  const user = await requireUser();
  const userId = Number(user.id);
  const membership = await db.query.clubMemberships.findFirst({
    where: and(
      eq(clubMemberships.userId, userId),
      eq(clubMemberships.clubId, clubId),
      eq(clubMemberships.isActive, true),
    ),
  });

  // Compatibility during rollout. The migration backfills this record, but a
  // stale local database must not lock an existing club lead out mid-deploy.
  const resolved =
    membership ??
    (user.role === "club_lead" && user.clubId === clubId
      ? ({
          id: `legacy-${userId}-${clubId}`,
          userId,
          clubId,
          membershipRole: "president",
          canEditPage: true,
          canManageEvents: true,
          canManageMedia: true,
          isActive: true,
          invitedByUserId: null,
          revokedByUserId: null,
          revokedAt: null,
          createdAt: "",
          updatedAt: "",
        } satisfies DbClubMembership)
      : null);

  if (!resolved || (permission && !membershipAllows(resolved, permission))) {
    throw new Error("FORBIDDEN");
  }
  return { user, membership: resolved };
}

export async function requireClubPresident(clubId: number) {
  const access = await requireClubMembership(clubId, "manage_team");
  if (access.membership.membershipRole !== "president") {
    throw new Error("FORBIDDEN");
  }
  return access;
}

export async function inviteClubMember(input: {
  clubId: number;
  email: string;
  name: string;
  temporaryPassword: string;
  canEditPage: boolean;
  canManageEvents: boolean;
  canManageMedia: boolean;
}) {
  const { user: actor } = await requireClubPresident(input.clubId);
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || !name) throw new Error("INVALID_MEMBER");

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!existing && input.temporaryPassword.length < 10) {
    throw new Error("PASSWORD_TOO_SHORT");
  }

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    let memberUserId = existing?.id;
    if (!memberUserId) {
      const password = await bcrypt.hash(input.temporaryPassword, 12);
      const [created] = await tx
        .insert(users)
        .values({
          name,
          email,
          password,
          role: "viewer",
          mustChangePassword: true,
        })
        .returning({ id: users.id });
      memberUserId = created.id;
      await tx.insert(auditLog).values({
        id: newId(),
        actorUserId: Number(actor.id),
        clubId: input.clubId,
        action: "club_member.temporary_password_created",
        targetId: String(memberUserId),
        meta: { email },
      });
    }

    const current = await tx.query.clubMemberships.findFirst({
      where: and(
        eq(clubMemberships.userId, memberUserId),
        eq(clubMemberships.clubId, input.clubId),
      ),
    });
    const permissions = {
      canEditPage: input.canEditPage,
      canManageEvents: input.canManageEvents,
      canManageMedia: input.canManageMedia,
      isActive: true,
      revokedAt: null,
      revokedByUserId: null,
      updatedAt: now,
    };
    if (current) {
      await tx
        .update(clubMemberships)
        .set(permissions)
        .where(eq(clubMemberships.id, current.id));
    } else {
      await tx.insert(clubMemberships).values({
        id: newId(),
        userId: memberUserId,
        clubId: input.clubId,
        membershipRole: "member",
        invitedByUserId: Number(actor.id),
        ...permissions,
      });
    }
    await tx.insert(auditLog).values({
      id: newId(),
      actorUserId: Number(actor.id),
      clubId: input.clubId,
      action: existing ? "club_member.access_granted" : "club_member.invited",
      targetId: String(memberUserId),
      meta: { email, ...permissions },
    });
  });
}

export async function updateClubMemberAccess(input: {
  clubId: number;
  membershipId: string;
  canEditPage: boolean;
  canManageEvents: boolean;
  canManageMedia: boolean;
  revoke?: boolean;
}) {
  const { user } = await requireClubPresident(input.clubId);
  const membership = await db.query.clubMemberships.findFirst({
    where: and(
      eq(clubMemberships.id, input.membershipId),
      eq(clubMemberships.clubId, input.clubId),
    ),
  });
  if (!membership || membership.membershipRole === "president") {
    throw new Error("INVALID_MEMBER");
  }
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx
      .update(clubMemberships)
      .set({
        canEditPage: input.canEditPage,
        canManageEvents: input.canManageEvents,
        canManageMedia: input.canManageMedia,
        isActive: !input.revoke,
        revokedAt: input.revoke ? now : null,
        revokedByUserId: input.revoke ? Number(user.id) : null,
        updatedAt: now,
      })
      .where(eq(clubMemberships.id, membership.id));
    await tx.insert(auditLog).values({
      id: newId(),
      actorUserId: Number(user.id),
      clubId: input.clubId,
      action: input.revoke
        ? "club_member.access_revoked"
        : "club_member.permissions_changed",
      targetId: String(membership.userId),
      meta: {
        canEditPage: input.canEditPage,
        canManageEvents: input.canManageEvents,
        canManageMedia: input.canManageMedia,
      },
    });
  });
}

export async function transferClubPresidency(input: {
  clubId: number;
  membershipId: string;
  confirmation: string;
}) {
  const { user, membership: currentPresident } =
    await requireClubPresident(input.clubId);
  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, input.clubId),
  });
  if (!club || input.confirmation.trim() !== club.name) {
    throw new Error("CONFIRMATION_MISMATCH");
  }
  const nextPresident = await db.query.clubMemberships.findFirst({
    where: and(
      eq(clubMemberships.id, input.membershipId),
      eq(clubMemberships.clubId, input.clubId),
      eq(clubMemberships.isActive, true),
    ),
  });
  if (!nextPresident || nextPresident.membershipRole !== "member") {
    throw new Error("INVALID_MEMBER");
  }

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx
      .update(clubMemberships)
      .set({ membershipRole: "member", updatedAt: now })
      .where(eq(clubMemberships.id, currentPresident.id));
    await tx
      .update(clubMemberships)
      .set({
        membershipRole: "president",
        canEditPage: true,
        canManageEvents: true,
        canManageMedia: true,
        updatedAt: now,
      })
      .where(eq(clubMemberships.id, nextPresident.id));
    await tx
      .update(clubs)
      .set({ leadId: nextPresident.userId, updatedAt: now })
      .where(eq(clubs.id, input.clubId));
    await tx.insert(auditLog).values({
      id: newId(),
      actorUserId: Number(user.id),
      clubId: input.clubId,
      action: "club.presidency_transferred",
      targetId: String(nextPresident.userId),
      meta: { formerPresidentUserId: currentPresident.userId },
    });
  });
}
