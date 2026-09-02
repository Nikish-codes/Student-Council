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
  const academyLogoId = s(fd, "academyLogoId")
    ? Number(s(fd, "academyLogoId"))
    : null;
  const tagline = s(fd, "tagline");
  const galleryImageIds = json<number[]>(fd, "galleryImageIds", []);

  // Upsert the single config row (id = 1).
  const existing = await db.query.sportsPageConfig.findFirst();
  if (existing) {
    await db
      .update(t)
      .set({
        academyLogoId,
        tagline,
        galleryImageIds,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(t.id, existing.id));
  } else {
    await db.insert(t).values({
      id: 1,
      academyLogoId,
      tagline,
      galleryImageIds,
    });
  }

  ["/sports", "/management/sports/settings"].forEach((p) => revalidatePath(p));
}
