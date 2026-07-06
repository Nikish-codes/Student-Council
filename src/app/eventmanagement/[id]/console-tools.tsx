"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ScanLine, UserPlus } from "lucide-react";
import { consoleCheckIn, addAttendee, type ConsoleActionState } from "./actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "…" : label}
    </button>
  );
}

const input =
  "w-full rounded-xl border border-line/15 bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-line/40";

function Msg({ state }: { state: ConsoleActionState }) {
  if (!state) return null;
  return (
    <p className={`mt-2 text-sm ${state.ok ? "text-emerald-400" : "text-red-400"}`}>
      {state.message}
    </p>
  );
}

export function ConsoleTools({ eventId }: { eventId: number }) {
  const [checkState, checkAction] = useActionState(
    consoleCheckIn.bind(null, eventId),
    undefined,
  );
  const [addState, addAction] = useActionState(
    addAttendee.bind(null, eventId),
    undefined,
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="surface-card rounded-2xl p-5">
        <p className="kicker flex items-center gap-2 text-subtle">
          <ScanLine className="h-4 w-4" /> Quick check-in
        </p>
        <form action={checkAction} className="mt-3 flex gap-2">
          <input
            name="scan"
            autoComplete="off"
            placeholder="WSC-XXXX-XXXX or paste QR"
            className={`${input} font-mono uppercase`}
          />
          <Submit label="Check in" />
        </form>
        <Msg state={checkState} />
        <p className="mt-2 text-xs text-subtle">
          Type a code, or use the{" "}
          <a href={`/eventmanagement/${eventId}/checkin`} className="underline hover:text-ink">
            camera scanner
          </a>{" "}
          for the gate.
        </p>
      </div>

      <div className="surface-card rounded-2xl p-5">
        <p className="kicker flex items-center gap-2 text-subtle">
          <UserPlus className="h-4 w-4" /> Add walk-in
        </p>
        <form action={addAction} className="mt-3 flex flex-col gap-2">
          <input name="name" required placeholder="Full name" className={input} />
          <div className="flex gap-2">
            <input name="email" type="email" required placeholder="Email" className={input} />
            <input name="phone" placeholder="Phone" className={`${input} max-w-[40%]`} />
          </div>
          <Submit label="Add + issue ticket" />
        </form>
        <Msg state={addState} />
      </div>
    </div>
  );
}
