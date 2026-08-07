"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { highlights as t } from "@/db/schema";
import { requireOps, requireRole } from "@/lib/rbac";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const SPANS = ["sm", "md", "lg", "xl"];

function bust() {
  revalidatePath("/");
  revalidatePath("/management/highlights");
}

export async function saveHighlight(id: number | null, fd: FormData) {
  await requireOps();
  const span = s(fd, "span");
  const values = {
    imageId: s(fd, "imageId") ? Number(s(fd, "imageId")) : null,
    alt: s(fd, "alt"),
    caption: s(fd, "caption") || null,
    span: (SPANS.includes(span) ? span : "md") as "sm" | "md" | "lg" | "xl",
    sortOrder: Number(s(fd, "sortOrder") || 99),
  };
  if (id) {
    await db.update(t).set({ ...values, updatedAt: new Date().toISOString() }).where(eq(t.id, id));
  } else {
    await db.insert(t).values(values);
  }
  bust();
  redirect("/management/highlights");
}

export async function deleteHighlight(id: number) {
  await requireRole("super_admin", "admin");
  await db.delete(t).where(eq(t.id, id));
  bust();
}

export async function moveHighlight(id: number, dir: "up" | "down") {
  await requireOps();
  const rows = await db.select().from(t).orderBy(asc(t.sortOrder), asc(t.id));
  const i = rows.findIndex((g) => g.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return;

  const row = rows[i];
  const other = rows[j];
  const a = row.sortOrder === other.sortOrder ? i * 10 : row.sortOrder;
  const b = row.sortOrder === other.sortOrder ? j * 10 : other.sortOrder;
  await db.update(t).set({ sortOrder: b }).where(eq(t.id, row.id));
  await db.update(t).set({ sortOrder: a }).where(eq(t.id, other.id));
  bust();
}
