"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { councilMembers as t, siteSettings } from "@/db/schema";
import { requireOps, requireRole } from "@/lib/rbac";
import type { CouncilMemberType } from "@/lib/schemas";

const MEMBER_TYPES: CouncilMemberType[] = ["president", "member", "co_lead"];

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function bust() {
  [
    "/",
    "/council",
    "/management/council",
    "/management/council/groups",
  ].forEach((p) => revalidatePath(p));
}

export async function saveCouncil(id: number | null, fd: FormData) {
  await requireOps();
  // `memberType` is the source of truth; `isPresident` is written in sync so the
  // older flag never drifts and a rollback stays a plain `git revert`.
  const raw = s(fd, "memberType");
  const memberType: CouncilMemberType = MEMBER_TYPES.includes(
    raw as CouncilMemberType,
  )
    ? (raw as CouncilMemberType)
    : "member";
  const isPresident = memberType === "president";
  const values = {
    name: s(fd, "name"),
    role: s(fd, "role"),
    program: s(fd, "program"),
    photoId: s(fd, "photoId") ? Number(s(fd, "photoId")) : null,
    email: s(fd, "email") || null,
    linkedin: s(fd, "linkedin") || null,
    message: s(fd, "message") || null,
    quote: s(fd, "quote") || null,
    bio: s(fd, "bio") || null,
    memberType,
    groupId: s(fd, "groupId") ? Number(s(fd, "groupId")) : null,
    isPresident,
    featured: fd.get("featured") === "on",
    sortOrder: Number(s(fd, "sortOrder") || 99),
  };

  let savedId = id;
  if (id) {
    await db
      .update(t)
      .set({ ...values, updatedAt: new Date().toISOString() })
      .where(eq(t.id, id));
  } else {
    const [row] = await db.insert(t).values(values).returning({ id: t.id });
    savedId = row.id;
  }

  // Enforce a single president: demote everyone else to a plain member.
  if (isPresident && savedId) {
    await db
      .update(t)
      .set({ memberType: "member", isPresident: false })
      .where(ne(t.id, savedId));
  }

  bust();
  redirect("/management/council");
}

export async function deleteCouncil(id: number) {
  await requireRole("super_admin", "admin");
  await db.delete(t).where(eq(t.id, id));
  bust();
}

export async function saveCouncilGroupPhoto(fd: FormData) {
  await requireOps();
  const selectedId = s(fd, "groupPhotoId");
  const values = {
    councilGroupPhotoId: selectedId ? Number(selectedId) : null,
    updatedAt: new Date().toISOString(),
  };

  await db
    .insert(siteSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: siteSettings.id, set: values });

  revalidatePath("/council");
  revalidatePath("/management/council");
}
