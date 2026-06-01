"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function loginAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
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
