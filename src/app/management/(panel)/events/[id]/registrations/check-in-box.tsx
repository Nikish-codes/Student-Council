"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ScanLine } from "lucide-react";
import { checkInByTicket } from "./actions";
import { Button } from "@/components/ui/button";

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "…" : "Check in"}</Button>;
}

export function CheckInBox({ eventId }: { eventId: number }) {
  const [state, action] = useActionState(checkInByTicket.bind(null, eventId), undefined);
  return (
    <div className="surface-card rounded-2xl p-5">
      <p className="kicker flex items-center gap-2 text-subtle">
        <ScanLine className="h-4 w-4" /> Quick check-in
      </p>
      <form action={action} className="mt-3 flex gap-2">
        <input
          name="ticket"
          autoFocus
          autoComplete="off"
          placeholder="WSC-XXXX-XXXX"
          className="flex-1 rounded-xl border border-line/15 bg-surface-2 px-3 py-2.5 font-mono text-sm uppercase text-ink outline-none focus:border-line/40"
        />
        <Submit />
      </form>
      {state ? (
        <p className={`mt-2 text-sm ${state.ok ? "text-emerald-300" : "text-red-400"}`}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
