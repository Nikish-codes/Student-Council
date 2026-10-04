"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sportsPageConfig as t } from "@/db/schema";
import { requireSportsManager } from "@/lib/rbac";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
function json<T>(fd: FormData, k: string, fallback: T): T {
  try {
    const v = s(fd, k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveSportsSettings(fd: FormData) {
  await requireSportsManager();
  const existing = await db.query.sportsPageConfig.findFirst();

  const academyLogoId = fd.has("academyLogoId")
    ? s(fd, "academyLogoId")
      ? Number(s(fd, "academyLogoId"))
      : null
    : (existing?.academyLogoId ?? null);

  const tagline = fd.has("tagline")
    ? s(fd, "tagline")
    : (existing?.tagline ?? "");

  const galleryImageIds = fd.has("galleryImageIds")
    ? json<number[]>(fd, "galleryImageIds", [])
    : Array.isArray(existing?.galleryImageIds)
      ? existing!.galleryImageIds
      : [];

  const calendarImageId = fd.has("calendarImageId")
    ? s(fd, "calendarImageId")
      ? Number(s(fd, "calendarImageId"))
      : null
    : (existing?.calendarImageId ?? null);

  const calendarTitle = fd.has("calendarTitle")
    ? s(fd, "calendarTitle")
    : (existing?.calendarTitle ?? "");

  const calendarDescription = fd.has("calendarDescription")
    ? s(fd, "calendarDescription")
    : (existing?.calendarDescription ?? "");

  // Upsert the single config row (id = 1).
  if (existing) {
    await db
      .update(t)
      .set({
        academyLogoId,
        calendarImageId,
        calendarTitle,
        calendarDescription,
        tagline,
        galleryImageIds,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(t.id, existing.id));
  } else {
    await db.insert(t).values({
      id: 1,
      academyLogoId,
      calendarImageId,
      calendarTitle,
      calendarDescription,
      tagline,
      galleryImageIds,
    });
  }

  [
    "/sports",
    "/sports/calendar",
    "/management/sports",
    "/management/sports/settings",
    "/management/sports/calendar",
  ].forEach((p) => revalidatePath(p));
}

export const saveSportsCalendarSettings = saveSportsSettings;
