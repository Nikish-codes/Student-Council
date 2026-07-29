"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { clubCategories as t, clubs as c } from "@/db/schema";
import { requireOps, requireRole } from "@/lib/rbac";
import { uniqueSlug } from "@/lib/slug";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function bust() {
  ["/", "/clubs", "/management/clubs", "/management/clubs/categories"].forEach(
    (p) => revalidatePath(p),
  );
}

export async function saveClubCategory(id: number | null, fd: FormData) {
  await requireOps();
  const label = s(fd, "label");
  const base = {
    label,
    blurb: s(fd, "blurb") || null,
    sortOrder: Number(s(fd, "sortOrder") || 99),
  };

  if (id) {
    const existing = await db.query.clubCategories.findFirst({
      where: eq(t.id, id),
    });
    if (!existing) throw new Error("NOT_FOUND");
    // The slug is the /clubs anchor (#cat-<slug>), so only re-derive it when the
    // editor actually asked for a different one — otherwise old links break.
    const requested = s(fd, "slug");
    const slug = requested
      ? await uniqueSlug("clubCategories", requested, id)
      : existing.slug;
    await db
      .update(t)
      .set({ ...base, slug, updatedAt: new Date().toISOString() })
      .where(eq(t.id, id));
  } else {
    const slug = await uniqueSlug("clubCategories", s(fd, "slug") || label);
    await db.insert(t).values({ ...base, slug });
  }

  bust();
  redirect("/management/clubs/categories");
}

/**
 * Deleting a category never deletes clubs: they're detached (category_id → null)
 * and reappear under the trailing "More Clubs" heading on /clubs until refiled.
 */
export async function deleteClubCategory(id: number) {
  await requireRole("super_admin", "admin");
  await db.update(c).set({ categoryId: null }).where(eq(c.categoryId, id));
  await db.delete(t).where(eq(t.id, id));
  bust();
}

/** Nudge a category up or down the page by swapping order with its neighbour. */
export async function moveClubCategory(id: number, dir: "up" | "down") {
  await requireOps();
  const rows = await db.select().from(t).orderBy(asc(t.sortOrder), asc(t.id));
  const i = rows.findIndex((g) => g.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return;

  const row = rows[i];
  const other = rows[j];
  // Swap, falling back to index-derived values when both rows share an order.
  const a = row.sortOrder === other.sortOrder ? i * 10 : row.sortOrder;
  const b = row.sortOrder === other.sortOrder ? j * 10 : other.sortOrder;
  await db.update(t).set({ sortOrder: b }).where(eq(t.id, row.id));
  await db.update(t).set({ sortOrder: a }).where(eq(t.id, other.id));
  bust();
}

/**
 * Bulk-file clubs into a category from the category editor — the fast path when
 * reorganising the page, versus opening each club one at a time.
 */
export async function assignClubsToCategory(id: number, fd: FormData) {
  await requireOps();
  const picked = fd
    .getAll("clubIds")
    .map((v) => Number(String(v)))
    .filter((n) => Number.isFinite(n));

  // Clear everyone currently in this category, then set the new selection, so
  // unticking a club actually removes it.
  await db.update(c).set({ categoryId: null }).where(eq(c.categoryId, id));
  if (picked.length) {
    await db.update(c).set({ categoryId: id }).where(inArray(c.id, picked));
  }

  bust();
  redirect("/management/clubs/categories");
}
