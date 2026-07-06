"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Search, Ticket, CheckCircle2 } from "lucide-react";
import { lookupTickets, type LookupState } from "./actions";

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(+d)
    ? iso
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      <Search className="h-4 w-4" />
      {pending ? "Searching…" : "Find"}
    </button>
  );
}

export function LookupForm() {
  const [state, action] = useActionState<LookupState | undefined, FormData>(
    lookupTickets,
    undefined,
  );

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex gap-2">
        <input
          name="contact"
          required
          autoFocus
          placeholder="Email or phone"
          className="flex-1 rounded-xl border border-line/15 bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-line/40"
        />
        <Submit />
      </form>

      {state?.error ? (
        <p className="text-sm text-red-400">{state.error}</p>
      ) : null}

      {state?.submitted && state.tickets ? (
        state.tickets.length === 0 ? (
          <p className="text-sm text-subtle">
            No tickets found for that email or phone. Double-check what you
            registered with.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {state.tickets.map((t) => (
              <li key={t.code}>
                <Link
                  href={t.href}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line/15 bg-surface p-4 transition-colors hover:border-line/40"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      <Ticket className="h-4 w-4 shrink-0 text-accent" />
                      <span className="truncate">{t.title}</span>
                    </span>
                    <span className="mt-1 block font-mono text-xs text-subtle">
                      {t.code} · {fmt(t.date)}
                    </span>
                  </span>
                  {t.checkedIn ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
