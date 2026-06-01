"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
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
