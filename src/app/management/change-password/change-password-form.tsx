"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { changeRequiredPassword } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "Updating…" : "Set new password"}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [error, action] = useActionState(changeRequiredPassword, undefined);
  const input =
    "h-11 rounded-xl border border-line/15 bg-surface-2 px-4 text-ink outline-none transition-colors focus:border-line/40";
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm text-muted">
        New password
        <input
          className={input}
          minLength={10}
          name="password"
          required
          type="password"
          autoComplete="new-password"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-muted">
        Confirm password
        <input
          className={input}
          minLength={10}
          name="confirmation"
          required
          type="password"
          autoComplete="new-password"
        />
      </label>
      {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
      <Submit />
    </form>
  );
}
