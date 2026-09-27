"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

export function DeleteButton({
  action,
  label = "Delete",
  confirmText = "Delete this item? This cannot be undone.",
}: {
  action: () => Promise<void | { ok?: boolean; error?: string }>;
  label?: string;
  confirmText?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(confirmText)) {
          start(async () => {
            try {
              const res = await action();
              if (res && typeof res === "object" && "ok" in res && !res.ok) {
                alert(res.error || "Failed to delete item");
              }
            } catch (err: unknown) {
              console.error("Delete action failed:", err);
              const msg = err instanceof Error ? err.message : "An unexpected error occurred while deleting.";
              alert(msg);
            }
          });
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-subtle transition-colors hover:text-red-400 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "…" : label}
    </button>
  );
}
