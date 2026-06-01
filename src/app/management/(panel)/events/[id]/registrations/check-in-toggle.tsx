"use client";

import { useTransition } from "react";
import { Check, Undo2 } from "lucide-react";
import { toggleCheckIn } from "./actions";

export function CheckInToggle({
  eventId,
  attendeeId,
  checkedIn,
}: {
  eventId: number;
  attendeeId: string;
  checkedIn: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => toggleCheckIn(eventId, attendeeId))}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50 ${
        checkedIn
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-line/15 text-muted hover:border-line/40 hover:text-ink"
      }`}
    >
      {checkedIn ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
      {checkedIn ? "Checked in" : "Check in"}
    </button>
  );
}
