"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { siteSettings as t } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import type { GrievanceCategory } from "@/lib/schemas";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
function json<T>(fd: FormData, k: string, fb: T): T {
  try {
    const v = s(fd, k);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
}

export async function saveSettings(fd: FormData) {
  await requireRole("super_admin", "admin");
  const values = {
    siteName: s(fd, "siteName") || "Woxsen Student Council",
    tagline: s(fd, "tagline") || null,
    contactEmail: s(fd, "contactEmail") || null,
    instagramUrl: s(fd, "instagramUrl") || null,
    linkedinUrl: s(fd, "linkedinUrl") || null,
    campus: {
      name: s(fd, "campusName"),
      coordinates: s(fd, "campusCoordinates"),
      timezone: s(fd, "campusTimezone") || "Asia/Kolkata",
      timezoneAbbr: s(fd, "campusTimezoneAbbr") || "IST",
    },
    grievanceCategories: json<GrievanceCategory[]>(fd, "grievanceCategories", []),
    grievanceMailTo: s(fd, "grievanceMailTo") || "council@woxsen.edu.in",
    updatedAt: new Date().toISOString(),
  };

  await db
    .insert(t)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: t.id, set: values });

  revalidatePath("/");
  revalidatePath("/support");
  revalidatePath("/management/settings");
}
