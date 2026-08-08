"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { homepageConfig as t } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import type { VaultStoryConfig } from "@/lib/schemas";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function json<T>(fd: FormData, k: string, fb: T): T {
  try {
    const v = s(fd, k);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
}

/**
 * Saves the custom vault stories to mp_homepage_config.vault_stories. Stories
 * without a title are dropped — they shouldn't render as empty tiles on the
 * homepage. An empty array clears the override, falling back to recap-based
 * vault stories from the Homepage editor.
 */
export async function saveVault(fd: FormData) {
  await requireRole("super_admin", "admin");

  const raw = json<VaultStoryConfig[]>(fd, "vaultStories", []);
  const stories = raw
    .filter((v) => v?.title?.trim())
    .map((v) => ({
      id: v.id || crypto.randomUUID(),
      kicker: v.kicker || "",
      title: v.title.trim(),
      year: v.year || "",
      line: v.line || "",
      mediaKind: v.mediaKind || "video",
      mediaSrc: v.mediaSrc || "",
      posterSrc: v.posterSrc || "",
      href: v.href || "/events",
    }));

  const values = {
    vaultStories: stories,
    updatedAt: new Date().toISOString(),
  };

  await db
    .insert(t)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: t.id, set: values });

  revalidatePath("/");
  revalidatePath("/management/vault");
}
