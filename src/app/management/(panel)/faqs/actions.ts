"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { faqs as t } from "@/db/schema";
import { requireOps, requireRole } from "@/lib/rbac";
import type { FaqItem } from "@/lib/schemas";

const PAGES = ["council", "support", "clubs", "events"];
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function bust() {
  ["/council", "/support", "/clubs", "/events", "/management/faqs"].forEach((p) => revalidatePath(p));
}

export async function saveFaq(id: number | null, fd: FormData) {
  await requireOps();
  const page = s(fd, "page");
  const values = {
    question: s(fd, "question"),
    answer: s(fd, "answer"),
    page: (PAGES.includes(page) ? page : "council") as FaqItem["page"],
    sortOrder: Number(s(fd, "sortOrder") || 99),
  };
  if (id) {
    await db.update(t).set({ ...values, updatedAt: new Date().toISOString() }).where(eq(t.id, id));
  } else {
    await db.insert(t).values(values);
  }
  bust();
  redirect("/management/faqs");
}

export async function deleteFaq(id: number) {
  await requireRole("super_admin", "admin");
  await db.delete(t).where(eq(t.id, id));
  bust();
}

export async function moveFaq(id: number, dir: "up" | "down") {
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
