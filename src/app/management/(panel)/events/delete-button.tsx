"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteEvent } from "./actions";
import { Button } from "@/components/ui/button";

export function DeleteEventButton({
  id,
  title,
  redirectTo,
  variant = "icon",
}: {
  id: number;
  title: string;
  /** Where to send the user after deletion (used by the editor). */
  redirectTo?: string;
  /** "icon" = compact row action; "full" = labelled button for the editor. */
  variant?: "icon" | "full";
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const onClick = () => {
    if (
      !confirm(
        `Delete “${title}” and its registrations, attendance, announcements, and recap data? This cannot be undone.`,
      )
    )
      return;
    start(async () => {
      try {
        await deleteEvent(id);
        toast.success("Event deleted");
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } catch {
        toast.error("The event could not be deleted. Refresh and try again.");
      }
    });
  };

  if (variant === "full") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={onClick}
        className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 className="h-4 w-4" />
        {pending ? "Deleting…" : "Delete"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      aria-label={`Delete ${title}`}
      className="inline-flex items-center justify-center rounded-lg p-1.5 text-subtle transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
