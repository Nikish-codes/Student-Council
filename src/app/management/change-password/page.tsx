import { redirect } from "next/navigation";

import { requireUser } from "@/lib/rbac";
import { ChangePasswordForm } from "./change-password-form";

export default async function RequiredPasswordPage() {
  const user = await requireUser();
  if (!user.mustChangePassword) redirect("/management");
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-bg px-6 text-ink">
      <section className="w-full max-w-md rounded-2xl border border-line/10 bg-surface p-7">
        <p className="kicker text-subtle">Account security</p>
        <h1 className="display mt-2 text-3xl">Choose your password</h1>
        <p className="mb-7 mt-3 text-sm leading-6 text-muted">
          Your club president created a temporary sign-in. Replace it before
          opening any management tools.
        </p>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
