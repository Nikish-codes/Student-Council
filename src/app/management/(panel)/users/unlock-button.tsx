"use client";

import { useTransition } from "react";
import { Unlock } from "lucide-react";

export function UnlockButton({ action }: { action: () => Promise<void> }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => action())}
      className="mr-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-subtle transition-colors hover:text-emerald-300 disabled:opacity-50"
    >
      <Unlock className="h-3.5 w-3.5" />
      {pending ? "…" : "Unlock"}
    </button>
  );
}
