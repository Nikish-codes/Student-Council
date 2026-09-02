"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sportsPeople as t } from "@/db/schema";
import { requireSportsDelete, requireSportsManager } from "@/lib/rbac";
import { uniqueSlug, slugify } from "@/lib/slug";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
function optNum(fd: FormData, k: string): number | null {
  const v = s(fd, k);
  return v === "" ? null : Number(v);
}

function bust() {
  ["/sports", "/management/sports", "/management/sports/people"].forEach((p) =>
    revalidatePath(p),
  );
}

export async function savePerson(id: number | null, fd: FormData) {
  await requireSportsManager();
  const base = {
    name: s(fd, "name"),
    photoId: optNum(fd, "photoId"),
    role: (s(fd, "role") === "alumni" ? "alumni" : "representative") as
      | "alumni"
      | "representative",
    bio: s(fd, "bio") || null,
    graduationYear: optNum(fd, "graduationYear"),
    sport: (s(fd, "sport") || null) as never,
    email: s(fd, "email") || null,
    phone: s(fd, "phone") || null,
    sortOrder: optNum(fd, "sortOrder") ?? 99,
  };
  let slug: string;
  if (id) {
    const existing = await db.query.sportsPeople.findFirst({
      where: eq(t.id, id),
    });
    if (!existing) throw new Error("NOT_FOUND");
    const requested = s(fd, "slug");
    slug =
      requested && slugify(requested) !== existing.slug
        ? await uniqueSlug("sportsPeople", requested, id)
        : existing.slug;
    await db
      .update(t)
      .set({ ...base, slug, updatedAt: new Date().toISOString() })
      .where(eq(t.id, id));
  } else {
    slug = await uniqueSlug("sportsPeople", s(fd, "slug") || base.name);
    await db.insert(t).values({ ...base, slug });
  }
  bust();
  redirect("/management/sports/people");
}

export async function deletePerson(id: number) {
  await requireSportsDelete();
  await db.delete(t).where(eq(t.id, id));
  bust();
}
