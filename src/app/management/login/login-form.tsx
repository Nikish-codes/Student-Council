"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const [error, formAction] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="kicker text-subtle">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="h-11 rounded-xl border border-line/15 bg-surface-2 px-4 text-ink outline-none transition-colors focus:border-line/40"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="kicker text-subtle">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11 rounded-xl border border-line/15 bg-surface-2 px-4 text-ink outline-none transition-colors focus:border-line/40"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
