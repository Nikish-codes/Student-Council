"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Radio, Flag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  updateMatchScore,
  addMatchEvent,
  removeMatchEvent,
} from "../actions";
import type { SportMatchEvent, SportMatchStatus } from "@/lib/schemas";

export function MatchCockpit({
  matchId,
  teamAName,
  teamBName,
  scoreA,
  scoreB,
  status,
  events,
}: {
  matchId: number;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  status: SportMatchStatus;
  events: SportMatchEvent[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [liveA, setLiveA] = useState(scoreA);
  const [liveB, setLiveB] = useState(scoreB);
  const [liveStatus, setLiveStatus] = useState<SportMatchStatus>(status);
  const [liveEvents, setLiveEvents] = useState<SportMatchEvent[]>(events || []);
  const [eventTime, setEventTime] = useState("");
  const [eventTeam, setEventTeam] = useState<"a" | "b">("a");
  const [eventType, setEventType] = useState("goal");
  const [eventDesc, setEventDesc] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const isLive = liveStatus === "live";
  const isFinished = liveStatus === "finished";

  function setScore(a: number, b: number, newStatus: SportMatchStatus) {
    setLiveA(a);
    setLiveB(b);
    setLiveStatus(newStatus);

    // Sync other form fields on the page so hitting "Save match" doesn't revert cockpit changes
    const elA = document.querySelector<HTMLInputElement>('input[name="scoreA"]');
    if (elA) elA.value = String(a);
    const elB = document.querySelector<HTMLInputElement>('input[name="scoreB"]');
    if (elB) elB.value = String(b);
    const elStatus = document.querySelector<HTMLSelectElement>('select[name="status"]');
    if (elStatus) elStatus.value = newStatus;

    start(async () => {
      try {
        await updateMatchScore(matchId, a, b, newStatus);
        setFeedback("Score updated");
        setTimeout(() => setFeedback(null), 2500);
        router.refresh();
      } catch (err) {
        console.error("Score update failed:", err);
        setFeedback("Failed to update score");
      }
    });
  }

  function submitEvent(e?: React.FormEvent | React.MouseEvent) {
    if (e) e.preventDefault();
    const timeValue = eventTime.trim() || "—";
    const descValue = eventDesc.trim() || undefined;

    const ev: SportMatchEvent = {
      time: timeValue,
      team: eventTeam,
      type: eventType,
      description: descValue,
    };

    // Optimistic UI update — immediately appears on the screen
    setLiveEvents((prev) => [...prev, ev]);
    setEventTime("");
    setEventDesc("");

    start(async () => {
      try {
        await addMatchEvent(matchId, ev);
        setFeedback("Event added to live feed");
        setTimeout(() => setFeedback(null), 2500);
        router.refresh();
      } catch (err) {
        console.error("Add event failed:", err);
        // Rollback optimistic update
        setLiveEvents((prev) => prev.slice(0, -1));
        alert("Failed to add event: " + (err instanceof Error ? err.message : String(err)));
      }
    });
  }

  function handleRemoveEvent(index: number) {
    const removedItem = liveEvents[index];
    setLiveEvents((prev) => prev.filter((_, i) => i !== index));

    start(async () => {
      try {
        await removeMatchEvent(matchId, index);
        setFeedback("Event removed");
        setTimeout(() => setFeedback(null), 2500);
        router.refresh();
      } catch (err) {
        console.error("Remove event failed:", err);
        // Rollback
        setLiveEvents((prev) => {
          const clone = [...prev];
          clone.splice(index, 0, removedItem);
          return clone;
        });
        alert("Failed to remove event: " + (err instanceof Error ? err.message : String(err)));
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Hidden input to ensure events persist if user clicks page Save button */}
      <input type="hidden" name="events" value={JSON.stringify(liveEvents)} readOnly />

      {/* Scoreline */}
      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-2xl border p-6 transition-colors",
          isLive
            ? "border-accent/40 bg-accent/5"
            : "border-line/15 bg-surface-2",
        )}
      >
        {/* Team A */}
        <div className="flex flex-1 flex-col items-center gap-2">
          <span className="kicker text-subtle text-center">{teamAName}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pending || isFinished}
              onClick={() => setScore(Math.max(0, liveA - 1), liveB, isLive ? "live" : "scheduled")}
              className="grid h-10 w-10 place-items-center rounded-full border border-line/15 text-muted hover:border-line/40 hover:text-ink disabled:opacity-30"
              aria-label={`Decrease score for ${teamAName}`}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="display text-6xl tabular-nums text-ink">{liveA}</span>
            <button
              type="button"
              disabled={pending || isFinished}
              onClick={() => setScore(liveA + 1, liveB, isLive ? "live" : "scheduled")}
              className="grid h-10 w-10 place-items-center rounded-full border border-line/15 text-muted hover:border-line/40 hover:text-ink disabled:opacity-30"
              aria-label={`Increase score for ${teamAName}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <span className="display text-4xl text-subtle">:</span>

        {/* Team B */}
        <div className="flex flex-1 flex-col items-center gap-2">
          <span className="kicker text-subtle text-center">{teamBName}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pending || isFinished}
              onClick={() => setScore(liveA, Math.max(0, liveB - 1), isLive ? "live" : "scheduled")}
              className="grid h-10 w-10 place-items-center rounded-full border border-line/15 text-muted hover:border-line/40 hover:text-ink disabled:opacity-30"
              aria-label={`Decrease score for ${teamBName}`}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="display text-6xl tabular-nums text-ink">{liveB}</span>
            <button
              type="button"
              disabled={pending || isFinished}
              onClick={() => setScore(liveA, liveB + 1, isLive ? "live" : "scheduled")}
              className="grid h-10 w-10 place-items-center rounded-full border border-line/15 text-muted hover:border-line/40 hover:text-ink disabled:opacity-30"
              aria-label={`Increase score for ${teamBName}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Status controls */}
      <div className="flex flex-wrap items-center gap-3">
        {!isLive && !isFinished && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setScore(liveA, liveB, "live")}
            className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
          >
            <Radio className="h-4 w-4 animate-pulse" />
            Go live
          </button>
        )}
        {isLive && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setScore(liveA, liveB, "finished")}
            className="inline-flex items-center gap-2 rounded-full border border-line/15 bg-surface-2 px-4 py-2 text-sm font-semibold text-muted hover:border-line/40 hover:text-ink disabled:opacity-50"
          >
            <Flag className="h-4 w-4" />
            Finish match
          </button>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em]",
            isLive ? "text-accent font-semibold" : "text-subtle",
          )}
        >
          {isLive && <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />}
          Status: {liveStatus}
        </span>
        {feedback && (
          <span className="font-mono text-xs text-accent animate-fade-in ml-auto">
            ✓ {feedback}
          </span>
        )}
      </div>

      {/* Event feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="kicker text-subtle">Event feed</span>
          {liveEvents.length > 0 && (
            <span className="font-mono text-[11px] text-muted">
              {liveEvents.length} event{liveEvents.length > 1 ? "s" : ""} logged
            </span>
          )}
        </div>

        {liveEvents.length > 0 ? (
          <div className="divide-y divide-line/10 rounded-xl border border-line/15 bg-surface/30">
            {liveEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="font-mono text-xs font-semibold tabular-nums text-subtle">{ev.time}</span>
                <span className={cn("h-2 w-2 rounded-full shrink-0", ev.team === "a" ? "bg-sky-400" : "bg-rose-400")} />
                <span className="font-medium text-ink capitalize">{ev.type}</span>
                {ev.description && <span className="text-muted truncate">· {ev.description}</span>}
                <span className="ml-auto text-xs text-subtle shrink-0">
                  {ev.team === "a" ? teamAName : teamBName}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleRemoveEvent(i)}
                  className="rounded-lg p-1 text-subtle hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                  title="Remove event"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-subtle">No events logged yet.</p>
        )}

        {/* Add event — Note: using DIV instead of FORM to prevent nested form collision with EditorShell */}
        <div className="grid gap-3 rounded-xl border border-line/15 bg-surface-2 p-4 sm:grid-cols-[auto_auto_auto_1fr_auto]">
          <input
            type="text"
            placeholder="23'"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitEvent();
              }
            }}
            className="w-20 rounded-lg border border-line/15 bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <select
            value={eventTeam}
            onChange={(e) => setEventTeam(e.target.value as "a" | "b")}
            className="rounded-lg border border-line/15 bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          >
            <option value="a">{teamAName}</option>
            <option value="b">{teamBName}</option>
          </select>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="rounded-lg border border-line/15 bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          >
            <option value="goal">Goal</option>
            <option value="yellow">Yellow card</option>
            <option value="red">Red card</option>
            <option value="sub">Substitution</option>
            <option value="penalty">Penalty</option>
            <option value="timeout">Timeout</option>
            <option value="other">Other</option>
          </select>
          <input
            type="text"
            placeholder="description (optional)"
            value={eventDesc}
            onChange={(e) => setEventDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitEvent();
              }
            }}
            className="rounded-lg border border-line/15 bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={submitEvent}
            disabled={pending}
            className="rounded-full border border-line/20 bg-surface px-5 py-2 text-xs font-semibold text-ink hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
          >
            {pending ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
