"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";

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
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/management",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    // signIn throws a redirect on success — must propagate.
    throw error;
  }
}
