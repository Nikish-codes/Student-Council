"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { media as t } from "@/db/schema";
import { requireOps, requireRole } from "@/lib/rbac";
import { deleteFromR2 } from "@/lib/r2";

function keyFromUrl(url: string): string | null {
  const idx = url.indexOf("/media/");
  if (idx === -1) return null;
  return url.slice(idx + 7);
}

export async function deleteMedia(id: number) {
  await requireRole("super_admin", "admin");
  const [row] = await db.select({ url: t.url }).from(t).where(eq(t.id, id));
  if (!row) return;
  const key = keyFromUrl(row.url);
  if (key) {
    try {
      await deleteFromR2(key);
    } catch {
      // R2 deletion is best-effort — the DB row is the source of truth.
    }
  }
  await db.delete(t).where(eq(t.id, id));
  revalidatePath("/management/media");
}

export async function updateMediaAlt(id: number, alt: string) {
  await requireOps();
  await db
    .update(t)
    .set({ alt: alt.trim(), updatedAt: new Date().toISOString() })
    .where(eq(t.id, id));
  revalidatePath("/management/media");
}
