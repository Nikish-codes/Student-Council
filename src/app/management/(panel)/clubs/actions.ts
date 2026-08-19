"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  clubs as t,
  media as mediaT,
  type ClubActivity,
  type ClubGalleryItem,
  type ClubVideo,
} from "@/db/schema";
import { normalizeAccent } from "@/lib/club-accent";
import { CLUB_GALLERY_UPLOAD_MAX_BYTES } from "@/lib/media-upload-policy";
import {
  assertCanEditClub,
  requireClubManager,
  requireRole,
} from "@/lib/rbac";
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

const gallerySizes = new Set(["small", "medium", "large"]);

async function validatedGallery(
  fd: FormData,
  existing: ClubGalleryItem[] = [],
): Promise<ClubGalleryItem[]> {
  const drafts = json<ClubGalleryItem[]>(fd, "gallery", []).filter((item) =>
    item?.url?.trim(),
  );
  const mediaIds = [
    ...new Set(
      drafts
        .map((item) => Number(item.mediaId))
        .filter((id) => Number.isSafeInteger(id) && id > 0),
    ),
  ];
  const mediaRows = mediaIds.length
    ? await db
        .select({
          id: mediaT.id,
          url: mediaT.url,
          mimeType: mediaT.mimeType,
          filesize: mediaT.filesize,
        })
        .from(mediaT)
        .where(inArray(mediaT.id, mediaIds))
    : [];
  const mediaById = new Map(mediaRows.map((row) => [row.id, row]));
  // Old URL-only entries are grandfathered so saving another club field does
  // not unexpectedly erase an existing gallery. The editor no longer exposes
  // a URL input, so every newly added photo must resolve to verified media.
  const legacyUrls = new Set(
    existing.filter((item) => !item.mediaId).map((item) => item.url.trim()),
  );

  return drafts.flatMap((draft) => {
    const mediaId = Number(draft.mediaId);
    const media = Number.isSafeInteger(mediaId)
      ? mediaById.get(mediaId)
      : undefined;
    const size = gallerySizes.has(String(draft.size)) ? draft.size : "medium";
    const caption = draft.caption?.trim().slice(0, 160) || undefined;

    if (media) {
      const validPhoto =
        media.mimeType?.startsWith("image/") &&
        typeof media.filesize === "number" &&
        media.filesize > 0 &&
        media.filesize <= CLUB_GALLERY_UPLOAD_MAX_BYTES;
      return validPhoto
        ? [{ url: media.url, mediaId: media.id, size, caption }]
        : [];
    }
    return legacyUrls.has(draft.url.trim())
      ? [{ url: draft.url.trim(), size, caption }]
      : [];
  });
}

export async function saveClub(id: number | null, fd: FormData) {
  const user = await requireClubManager();
  // Club leads edit only their own club, and may not create new ones.
  assertCanEditClub(user, id);

  const existing = id
    ? await db.query.clubs.findFirst({ where: eq(t.id, id) })
    : null;
  if (id && !existing) throw new Error("NOT_FOUND");
  const gallery = await validatedGallery(
    fd,
    (existing?.gallery as ClubGalleryItem[] | null) ?? [],
  );

  const base = {
    name: s(fd, "name"),
    logoId: s(fd, "logoId") ? Number(s(fd, "logoId")) : null,
    blurb: s(fd, "blurb"),
    joinUrl: s(fd, "joinUrl") || null,
    tags: list(fd, "tags"),
    members: s(fd, "members") ? Number(s(fd, "members")) : null,
    categoryId: s(fd, "categoryId") ? Number(s(fd, "categoryId")) : null,
    ...(user.role === "club_lead"
      ? {}
      : { leadId: s(fd, "leadId") ? Number(s(fd, "leadId")) : null }),
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
    gallery,
    instagramUrl: s(fd, "instagramUrl") || null,
    linkedinUrl: s(fd, "linkedinUrl") || null,
    websiteUrl: s(fd, "websiteUrl") || null,
    contactEmail: s(fd, "contactEmail") || null,
  };

  let slug: string;
  if (id && existing) {
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
  redirect(
    user.role === "club_lead" && id
      ? `/management/clubs/${id}`
      : "/management/clubs",
  );
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
