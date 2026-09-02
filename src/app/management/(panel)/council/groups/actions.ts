"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { councilGroups as t, councilMembers as m } from "@/db/schema";
import { requireOps, requireRole } from "@/lib/rbac";
import type { CouncilCardSize, CouncilGroupLayout } from "@/lib/schemas";

const CARD_SIZES = ["sm", "md", "lg"] as const;
const LAYOUTS = ["grid", "hscroll"] as const;

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function bust() {
  ["/council", "/management/council", "/management/council/groups"].forEach(
    (p) => revalidatePath(p),
  );
}

export async function saveCouncilGroup(id: number | null, fd: FormData) {
  await requireOps();

  const cardSize = s(fd, "cardSize");
  const layout = s(fd, "layout");
  const parentRaw = s(fd, "parentId");
  let parentId = parentRaw ? Number(parentRaw) : null;

  // A group cannot be its own parent, and nesting is one level deep — a group
  // that already has a parent can't also be someone's parent, or the page would
  // need to recurse arbitrarily deep.
  if (id && parentId === id) parentId = null;
  if (parentId) {
    const parent = await db.query.councilGroups.findFirst({
      where: eq(t.id, parentId),
    });
    if (!parent || parent.parentId != null) parentId = null;
  }

  const values = {
    title: s(fd, "title"),
    blurb: s(fd, "blurb") || null,
    parentId,
    perRow: Math.min(6, Math.max(1, Number(s(fd, "perRow") || 4))),
    cardSize: (CARD_SIZES.includes(cardSize as CouncilCardSize)
      ? cardSize
      : "md") as CouncilCardSize,
    layout: (LAYOUTS.includes(layout as CouncilGroupLayout)
      ? layout
      : "grid") as CouncilGroupLayout,
    sortOrder: Number(s(fd, "sortOrder") || 99),
  };

  if (id) {
    await db
      .update(t)
      .set({ ...values, updatedAt: new Date().toISOString() })
      .where(eq(t.id, id));
  } else {
    await db.insert(t).values(values);
  }

  bust();
  redirect("/management/council/groups");
}

/**
 * Deleting a section does NOT delete the people in it: members are detached
 * (group_id → null) and any sub-groups are promoted to top level, so the page
 * keeps every profile saved. Detached members stop appearing on the public
 * Council page until they are assigned to another section.
 */
export async function deleteCouncilGroup(id: number) {
  await requireRole("super_admin", "admin");
  await db.update(m).set({ groupId: null }).where(eq(m.groupId, id));
  await db.update(t).set({ parentId: null }).where(eq(t.parentId, id));
  await db.delete(t).where(eq(t.id, id));
  bust();
}

/** Nudge a section up or down the page by swapping sort order with its neighbour. */
export async function moveCouncilGroup(id: number, dir: "up" | "down") {
  await requireOps();
  const row = await db.query.councilGroups.findFirst({ where: eq(t.id, id) });
  if (!row) return;

  // Only reorder within the same level: siblings share a parent.
  const siblings = await db.query.councilGroups.findMany({
    where:
      row.parentId == null ? isNull(t.parentId) : eq(t.parentId, row.parentId),
    orderBy: sql`${t.sortOrder} asc, ${t.id} asc`,
  });

  const i = siblings.findIndex((g) => g.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= siblings.length) return;

  const other = siblings[j];
  // Swap, falling back to index-derived values when both rows share an order.
  const a = row.sortOrder === other.sortOrder ? i * 10 : row.sortOrder;
  const b = row.sortOrder === other.sortOrder ? j * 10 : other.sortOrder;
  await db.update(t).set({ sortOrder: b }).where(eq(t.id, row.id));
  await db.update(t).set({ sortOrder: a }).where(eq(t.id, other.id));
  bust();
}
