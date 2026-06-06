"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { recaps as t, type RecapGalleryItem, type RecapStat } from "@/db/schema";
import { requireOps, requireRole } from "@/lib/rbac";
import { uniqueSlug, slugify } from "@/lib/slug";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
function json<T>(fd: FormData, k: string, fallback: T): T {
  try {
    const v = s(fd, k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function bust() {
  ["/", "/events", "/archive", "/management/recaps"].forEach((p) => revalidatePath(p));
}

export async function saveRecap(id: number | null, fd: FormData) {
  await requireOps();
  const base = {
    title: s(fd, "title"),
    eventId: s(fd, "eventId") ? Number(s(fd, "eventId")) : null,
    kicker: s(fd, "kicker") || null,
    blurb: s(fd, "blurb") || null,
    publishedAt: s(fd, "publishedAt") ? new Date(s(fd, "publishedAt")).toISOString() : null,
    heroMediaId: s(fd, "heroMediaId") ? Number(s(fd, "heroMediaId")) : null,
    heroVideoUrl: s(fd, "heroVideoUrl") || null,
    gallery: json<RecapGalleryItem[]>(fd, "gallery", []),
    stats: json<RecapStat[]>(fd, "stats", []),
    status: (s(fd, "status") === "published" ? "published" : "draft") as "draft" | "published",
  };

  if (id) {
    const existing = await db.query.recaps.findFirst({ where: eq(t.id, id) });
    if (!existing) throw new Error("NOT_FOUND");
    const requested = s(fd, "slug");
    const slug =
      requested && slugify(requested) !== existing.slug
        ? await uniqueSlug("recaps", requested, id)
        : existing.slug;
    await db.update(t).set({ ...base, slug, updatedAt: new Date().toISOString() }).where(eq(t.id, id));
  } else {
    const slug = await uniqueSlug("recaps", s(fd, "slug") || base.title);
    await db.insert(t).values({ ...base, slug });
  }
  bust();
  redirect("/management/recaps");
}

export async function deleteRecap(id: number) {
  await requireRole("super_admin", "admin");
  await db.delete(t).where(eq(t.id, id));
  bust();
}
