"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  clubs as t,
  type ClubActivity,
  type ClubGalleryItem,
  type ClubVideo,
} from "@/db/schema";
import { normalizeAccent } from "@/lib/club-accent";
import { assertCanEditClub, requireOps, requireRole } from "@/lib/rbac";
import { uniqueSlug, slugify } from "@/lib/slug";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const list = (fd: FormData, k: string) =>
  s(fd, k).split(",").map((x) => x.trim()).filter(Boolean);

/** Repeater fields arrive as a JSON string in a hidden input (see fields.tsx). */
function json<T>(fd: FormData, k: string, fallback: T): T {
  try {
    const v = s(fd, k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function bust(...slugs: (string | undefined)[]) {
  ["/", "/clubs", "/management/clubs", "/management/clubs/categories"].forEach(
    (p) => revalidatePath(p),
  );
  for (const slug of slugs) if (slug) revalidatePath(`/clubs/${slug}`);
}

export async function saveClub(id: number | null, fd: FormData) {
  const user = await requireOps();
  // Club leads edit only their own club, and may not create new ones.
  assertCanEditClub(user, id);

  const base = {
    name: s(fd, "name"),
    logoId: s(fd, "logoId") ? Number(s(fd, "logoId")) : null,
    blurb: s(fd, "blurb"),
    joinUrl: s(fd, "joinUrl") || null,
    tags: list(fd, "tags"),
    members: s(fd, "members") ? Number(s(fd, "members")) : null,
    categoryId: s(fd, "categoryId") ? Number(s(fd, "categoryId")) : null,
    leadId: s(fd, "leadId") ? Number(s(fd, "leadId")) : null,
    // ── detail-page content ──
    tagline: s(fd, "tagline") || null,
    about: s(fd, "about") || null,
    coverId: s(fd, "coverId") ? Number(s(fd, "coverId")) : null,
    // Anything that isn't a plain 6-digit hex is discarded rather than stored:
    // this value ends up in a style attribute on the public page.
    accentColor: normalizeAccent(s(fd, "accentColor")) ?? null,
    foundedYear: s(fd, "foundedYear") ? Number(s(fd, "foundedYear")) : null,
    // Rows the author left blank are dropped so they can't render as empty
    // list items / broken video tiles on the public page.
    activities: json<ClubActivity[]>(fd, "activities", []).filter((a) =>
      a?.title?.trim(),
    ),
    flagshipEvent: s(fd, "flagshipEvent") || null,
    videos: json<ClubVideo[]>(fd, "videos", []).filter((v) => v?.url?.trim()),
    gallery: json<ClubGalleryItem[]>(fd, "gallery", []).filter((g) =>
      g?.url?.trim(),
    ),
    instagramUrl: s(fd, "instagramUrl") || null,
    linkedinUrl: s(fd, "linkedinUrl") || null,
    websiteUrl: s(fd, "websiteUrl") || null,
    contactEmail: s(fd, "contactEmail") || null,
  };

  let slug: string;
  if (id) {
    const existing = await db.query.clubs.findFirst({ where: eq(t.id, id) });
    if (!existing) throw new Error("NOT_FOUND");
    const requested = s(fd, "slug");
    slug =
      requested && slugify(requested) !== existing.slug
        ? await uniqueSlug("clubs", requested, id)
        : existing.slug;
    await db
      .update(t)
      .set({ ...base, slug, updatedAt: new Date().toISOString() })
      .where(eq(t.id, id));
    // Flush the old slug too, or a rename leaves a stale copy behind.
    bust(slug, existing.slug);
  } else {
    slug = await uniqueSlug("clubs", s(fd, "slug") || base.name);
    await db.insert(t).values({ ...base, slug });
    bust(slug);
  }
  redirect("/management/clubs");
}

export async function deleteClub(id: number) {
  await requireRole("super_admin", "admin");
  const existing = await db.query.clubs.findFirst({
    where: eq(t.id, id),
    columns: { slug: true },
  });
  await db.delete(t).where(eq(t.id, id));
  bust(existing?.slug);
}
