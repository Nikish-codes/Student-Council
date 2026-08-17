"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sportsTeams as t } from "@/db/schema";
import { requireOps, requireRole } from "@/lib/rbac";
import { uniqueSlug, slugify } from "@/lib/slug";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function bust() {
  [
    "/sports",
    "/sports/calendar",
    "/management/sports",
    "/management/sports/teams",
  ].forEach((p) => revalidatePath(p));
  revalidatePath("/sports/tournaments/[slug]", "page");
  revalidatePath("/sports/leagues/[slug]", "page");
}

export async function saveTeam(id: number | null, fd: FormData) {
  await requireOps();
  const base = {
    name: s(fd, "name"),
    logoId: s(fd, "logoId") ? Number(s(fd, "logoId")) : null,
    clubId: s(fd, "clubId") ? Number(s(fd, "clubId")) : null,
  };
  let slug: string;
  if (id) {
    const existing = await db.query.sportsTeams.findFirst({
      where: eq(t.id, id),
    });
    if (!existing) throw new Error("NOT_FOUND");
    const requested = s(fd, "slug");
    slug =
      requested && slugify(requested) !== existing.slug
        ? await uniqueSlug("sportsTeams", requested, id)
        : existing.slug;
    await db
      .update(t)
      .set({ ...base, slug, updatedAt: new Date().toISOString() })
      .where(eq(t.id, id));
  } else {
    slug = await uniqueSlug("sportsTeams", s(fd, "slug") || base.name);
    await db.insert(t).values({ ...base, slug });
  }
  bust();
  redirect("/management/sports/teams");
}

export async function deleteTeam(id: number) {
  await requireRole("super_admin", "admin");
  await db.delete(t).where(eq(t.id, id));
  bust();
}
