"use client";

import { useTransition } from "react";
import { Unlock } from "lucide-react";

export function UnlockButton({
  action,
}: {
  action: () => Promise<void | { ok?: boolean; error?: string }>;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            const res = await action();
            if (res && typeof res === "object" && "ok" in res && !res.ok) {
              alert(res.error || "Failed to unlock user");
            }
          } catch (err: any) {
            console.error("Unlock action failed:", err);
            alert(err?.message || "An unexpected error occurred while unlocking.");
          }
        })
      }
      className="mr-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-subtle transition-colors hover:text-emerald-300 disabled:opacity-50"
    >
      <Unlock className="h-3.5 w-3.5" />
      {pending ? "…" : "Unlock"}
    </button>
  );
}
