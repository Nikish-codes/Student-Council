"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clubs as t } from "@/db/schema";
import { requireOps, requireRole } from "@/lib/rbac";
import { uniqueSlug, slugify } from "@/lib/slug";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const list = (fd: FormData, k: string) =>
  s(fd, k).split(",").map((x) => x.trim()).filter(Boolean);

function bust() {
  ["/", "/clubs", "/management/clubs"].forEach((p) => revalidatePath(p));
}

export async function saveClub(id: number | null, fd: FormData) {
  await requireOps();
  const base = {
    name: s(fd, "name"),
    logoId: s(fd, "logoId") ? Number(s(fd, "logoId")) : null,
    blurb: s(fd, "blurb"),
    joinUrl: s(fd, "joinUrl") || null,
    tags: list(fd, "tags"),
    members: s(fd, "members") ? Number(s(fd, "members")) : null,
    leadId: s(fd, "leadId") ? Number(s(fd, "leadId")) : null,
  };

  if (id) {
    const existing = await db.query.clubs.findFirst({ where: eq(t.id, id) });
    const requested = s(fd, "slug");
    const slug =
      requested && slugify(requested) !== existing?.slug
        ? await uniqueSlug("clubs", requested, id)
        : existing!.slug;
    await db.update(t).set({ ...base, slug, updatedAt: new Date().toISOString() }).where(eq(t.id, id));
  } else {
    const slug = await uniqueSlug("clubs", s(fd, "slug") || base.name);
    await db.insert(t).values({ ...base, slug });
  }
  bust();
  redirect("/management/clubs");
}

export async function deleteClub(id: number) {
  await requireRole("super_admin", "admin");
  await db.delete(t).where(eq(t.id, id));
  bust();
}
