"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { db } from "@/db/client";
import { auditLog, users } from "@/db/schema";
import { requireUser } from "@/lib/rbac";
import { newId } from "@/lib/tickets";

export async function changeRequiredPassword(
  _state: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireUser();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (password.length < 10) return "Use at least 10 characters.";
  if (password !== confirmation) return "The passwords do not match.";

  const hash = await bcrypt.hash(password, 12);
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        password: hash,
        mustChangePassword: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, Number(user.id)));
    await tx.insert(auditLog).values({
      id: newId(),
      actorUserId: Number(user.id),
      action: "user.required_password_changed",
      targetId: user.id,
    });
  });
  await signOut({ redirect: false });
  redirect("/management/login?password=changed");
}
