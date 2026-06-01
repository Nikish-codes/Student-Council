"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { supportChannels as t } from "@/db/schema";
import { requireOps, requireRole } from "@/lib/rbac";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const list = (fd: FormData, k: string) =>
  s(fd, k)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function bust() {
  revalidatePath("/support");
  revalidatePath("/management/support");
}

export async function saveSupport(id: number | null, fd: FormData) {
  await requireOps();
  const values = {
    name: s(fd, "name"),
    purpose: s(fd, "purpose"),
    description: s(fd, "description"),
    icon: s(fd, "icon") || "LifeBuoy",
    ownedBy: s(fd, "ownedBy"),
    bring: list(fd, "bring"),
    councilRole: s(fd, "councilRole"),
  };
  if (id) {
    await db.update(t).set({ ...values, updatedAt: new Date().toISOString() }).where(eq(t.id, id));
  } else {
    await db.insert(t).values(values);
  }
  bust();
  redirect("/management/support");
}

export async function deleteSupport(id: number) {
  await requireRole("super_admin", "admin");
  await db.delete(t).where(eq(t.id, id));
  bust();
}
