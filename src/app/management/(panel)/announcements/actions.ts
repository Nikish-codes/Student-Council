"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { announcements as t } from "@/db/schema";
import { requireOps, requireRole } from "@/lib/rbac";

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function toIso(v: string) {
  return v ? new Date(v).toISOString() : new Date().toISOString();
}

function bust() {
  revalidatePath("/");
  revalidatePath("/management/announcements");
}

export async function saveAnnouncement(id: number | null, fd: FormData) {
  await requireOps();
  const values = {
    title: s(fd, "title"),
    href: s(fd, "href") || null,
    date: toIso(s(fd, "date")),
    pinned: fd.get("pinned") === "on",
  };
  if (id) {
    await db.update(t).set({ ...values, updatedAt: new Date().toISOString() }).where(eq(t.id, id));
  } else {
    await db.insert(t).values(values);
  }
  bust();
  redirect("/management/announcements");
}

export async function deleteAnnouncement(id: number) {
  await requireRole("super_admin", "admin");
  await db.delete(t).where(eq(t.id, id));
  bust();
}
