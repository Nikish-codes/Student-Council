import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Management" };

export default async function ManagementLoginPage() {
  const session = await auth();
  if (session?.user) redirect("/management");

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="kicker text-subtle">Woxsen Student Council</p>
          <h1 className="display mt-2 text-3xl">Management</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to manage events, content and more.
          </p>
        </div>
        <div className="surface-card rounded-2xl p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
