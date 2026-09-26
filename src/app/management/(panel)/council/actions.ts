"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, ne, asc, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { councilMembers as t, siteSettings } from "@/db/schema";
import { requireOps, requireRole } from "@/lib/rbac";
import { revalidateClubPages } from "@/lib/revalidate-club";
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
  // Captured before the write so a reassignment can flush the previous club too.
  const previousClubId = id
    ? (
        await db.query.councilMembers.findFirst({
          where: eq(t.id, id),
          columns: { clubId: true },
        })
      )?.clubId
    : null;
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
    clubId: s(fd, "clubId") ? Number(s(fd, "clubId")) : null,
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
  if (isPresident && savedId && !values.clubId) {
    await db
      .update(t)
      .set({ memberType: "member", isPresident: false })
      .where(and(ne(t.id, savedId), isNull(t.clubId)));
  }

  bust();
  await revalidateClubPages(previousClubId, values.clubId);
  redirect("/management/council");
}

export async function deleteCouncil(id: number) {
  await requireRole("super_admin", "admin");
  const existing = await db.query.councilMembers.findFirst({
    where: eq(t.id, id),
    columns: { clubId: true },
  });
  await db.delete(t).where(eq(t.id, id));
  bust();
  await revalidateClubPages(existing?.clubId);
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

export async function moveCouncilMember(id: number, dir: "up" | "down") {
  await requireOps();
  const rows = await db
    .select()
    .from(t)
    .where(isNull(t.clubId))
    .orderBy(asc(t.sortOrder), asc(t.id));
  const i = rows.findIndex((g) => g.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return;

  const row = rows[i];
  const other = rows[j];
  const a = row.sortOrder === other.sortOrder ? i * 10 : row.sortOrder;
  const b = row.sortOrder === other.sortOrder ? j * 10 : other.sortOrder;
  await db.update(t).set({ sortOrder: b }).where(eq(t.id, row.id));
  await db.update(t).set({ sortOrder: a }).where(eq(t.id, other.id));
  bust();
}
