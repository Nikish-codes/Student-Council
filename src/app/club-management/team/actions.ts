"use server";

import { revalidatePath } from "next/cache";

import {
  inviteClubMember,
  transferClubPresidency,
  updateClubMemberAccess,
} from "@/lib/club-access";
import { requireStudioClub } from "@/lib/club-studio";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const checked = (fd: FormData, key: string) => fd.get(key) === "on";

export async function inviteMember(formData: FormData) {
  const active = await requireStudioClub(text(formData, "clubId"));
  await inviteClubMember({
    clubId: active.clubId,
    email: text(formData, "email"),
    name: text(formData, "name"),
    temporaryPassword: text(formData, "temporaryPassword"),
    canEditPage: checked(formData, "canEditPage"),
    canManageEvents: checked(formData, "canManageEvents"),
    canManageMedia: checked(formData, "canManageMedia"),
  });
  revalidatePath("/club-management/team");
}

export async function changeMemberAccess(formData: FormData) {
  const active = await requireStudioClub(text(formData, "clubId"));
  await updateClubMemberAccess({
    clubId: active.clubId,
    membershipId: text(formData, "membershipId"),
    canEditPage: checked(formData, "canEditPage"),
    canManageEvents: checked(formData, "canManageEvents"),
    canManageMedia: checked(formData, "canManageMedia"),
    revoke: text(formData, "intent") === "revoke",
  });
  revalidatePath("/club-management/team");
}

export async function transferPresident(formData: FormData) {
  const active = await requireStudioClub(text(formData, "clubId"));
  await transferClubPresidency({
    clubId: active.clubId,
    membershipId: text(formData, "membershipId"),
    confirmation: text(formData, "confirmation"),
  });
  revalidatePath("/club-management/team");
  revalidatePath("/club-management");
}
