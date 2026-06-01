"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { councilMembers as t } from "@/db/schema";
import { requireOps, requireRole } from "@/lib/rbac";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function bust() {
  ["/", "/council", "/management/council"].forEach((p) => revalidatePath(p));
}

export async function saveCouncil(id: number | null, fd: FormData) {
  await requireOps();
  const isPresident = fd.get("isPresident") === "on";
  const values = {
    name: s(fd, "name"),
    role: s(fd, "role"),
    program: s(fd, "program"),
    photoId: s(fd, "photoId") ? Number(s(fd, "photoId")) : null,
    email: s(fd, "email") || null,
    linkedin: s(fd, "linkedin") || null,
    message: s(fd, "message") || null,
    quote: s(fd, "quote") || null,
    isPresident,
    featured: fd.get("featured") === "on",
    sortOrder: Number(s(fd, "sortOrder") || 99),
  };

  let savedId = id;
  if (id) {
    await db.update(t).set({ ...values, updatedAt: new Date().toISOString() }).where(eq(t.id, id));
  } else {
    const [row] = await db.insert(t).values(values).returning({ id: t.id });
    savedId = row.id;
  }

  // Enforce a single president: clear the flag on everyone else.
  if (isPresident && savedId) {
    await db.update(t).set({ isPresident: false }).where(ne(t.id, savedId));
  }

  bust();
  redirect("/management/council");
}

export async function deleteCouncil(id: number) {
  await requireRole("super_admin", "admin");
  await db.delete(t).where(eq(t.id, id));
  bust();
}
