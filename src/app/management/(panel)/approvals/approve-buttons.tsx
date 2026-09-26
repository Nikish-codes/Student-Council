"use client";

import { useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";

export function ApproveAllButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      {pending ? "Approving…" : label}
    </button>
  );
}

export function ApproveClubButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-emerald-600/15 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-600/25 disabled:opacity-60"
    >
      {pending ? "Approving…" : "Approve all"}
    </button>
  );
}
