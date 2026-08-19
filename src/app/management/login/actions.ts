"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/db/client";
import { clubMemberships, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function loginAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  // Per-IP brute-force throttle on top of the per-account lockout. Catches
  // attackers spraying many emails against a single IP, which the account
  // lockout alone can't see.
  const h = await headers();
  const ip =
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const limit = rateLimit(`login:${ip}`, 10, 60_000);
  if (!limit.ok) {
    return "Too many login attempts. Please wait a minute and try again.";
  }

  try {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const account = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    const membership = account
      ? await db.query.clubMemberships.findFirst({
          where: and(
            eq(clubMemberships.userId, account.id),
            eq(clubMemberships.isActive, true),
          ),
        })
      : null;
    const redirectTo = account?.mustChangePassword
      ? "/management/change-password"
      : account?.role === "food_committee_member"
        ? "/management/oval"
        : account?.role === "club_lead" || membership
          ? "/club-management"
          : "/management";
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const msg = error.cause as Error | undefined;
      const detail = msg?.message ?? "";
      if (detail.startsWith("LOCKED:")) {
        const mins = detail.slice(7);
        return `Account locked. Try again in ${mins} minute${mins === "1" ? "" : "s"}.`;
      }
      if (detail.startsWith("FAILED:")) {
        const remaining = Number(detail.slice(7));
        if (remaining > 0)
          return `Invalid email or password. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`;
        return "Invalid email or password. Account is now locked for 10 minutes.";
      }
      return "Invalid email or password.";
    }
    // signIn throws a redirect on success — must propagate.
    throw error;
  }
}
