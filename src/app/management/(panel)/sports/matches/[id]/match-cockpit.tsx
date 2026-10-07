"use client";

import { useState, useTransition } from "react";
import { Plus, Minus, Flag, Radio, X, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SportMatchEvent } from "@/lib/schemas";
import { updateMatchScore, addMatchEvent, removeMatchEvent } from "../actions";

type MatchCockpitProps = {
  matchId: number;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  status: "cancelled" | "scheduled" | "live" | "finished";
  events: SportMatchEvent[];
};

export function MatchCockpit({
  matchId,
  teamAName,
  teamBName,
  scoreA,
  scoreB,
  status,
  events,
}: MatchCockpitProps) {
  const [liveA, setLiveA] = useState(scoreA);
  const [liveB, setLiveB] = useState(scoreB);
  const [liveStatus, setLiveStatus] = useState(status);
  const [liveEvents, setLiveEvents] = useState(events);
  
  const [eventTime, setEventTime] = useState("");
  const [eventTeam, setEventTeam] = useState<"a" | "b">("a");
  const [eventType, setEventType] = useState("goal");
  const [eventDesc, setEventDesc] = useState("");
  
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");

  const isLive = liveStatus === "live";
  const isFinished = liveStatus === "finished";

  function setScore(a: number, b: number, newStatus: typeof liveStatus) {
    if (isNaN(matchId)) {
        alert("Please save this new match first before using live controls!");
        return;
    }
    setLiveA(a);
    setLiveB(b);
    setLiveStatus(newStatus);
    
    setFeedback("Updating...");
    startTransition(async () => {
      await updateMatchScore(matchId, a, b, newStatus);
      setFeedback("Score saved");
      setTimeout(() => setFeedback(""), 2000);
    });
  }

  function submitEvent() {
    if (!eventTime || !eventType) return;
    if (isNaN(matchId)) {
        alert("Please save this new match first before using live controls!");
        return;
    }
    const newEvent = {
      time: eventTime,
      team: eventTeam,
      type: eventType,
      description: eventDesc,
    };
    
    setLiveEvents((prev) => [...prev, newEvent]);
    
    setFeedback("Updating...");
    startTransition(async () => {
      await addMatchEvent(matchId, newEvent);
      setFeedback("Event saved");
      setTimeout(() => setFeedback(""), 2000);
    });
    
    setEventTime("");
    setEventDesc("");
  }

  function handleRemoveEvent(index: number) {
    if (isNaN(matchId)) return;
    const newEvents = liveEvents.filter((_, i) => i !== index);
    setLiveEvents(newEvents);
    
    setFeedback("Updating...");
    startTransition(async () => {
      await removeMatchEvent(matchId, index);
      setFeedback("Event removed");
      setTimeout(() => setFeedback(""), 2000);
    });
  }

  function toggleDisplaySwap() {
    if (isNaN(matchId)) {
        alert("Please save this new match first before using live controls!");
        return;
    }
    const newEvent = {
      time: "SYS",
      team: "a" as const,
      type: "swap_display",
      description: "Display swapped",
    };
    setLiveEvents((prev) => [...prev, newEvent]);
    
    setFeedback("Updating...");
    startTransition(async () => {
      await addMatchEvent(matchId, newEvent);
      setFeedback("Display swapped");
      setTimeout(() => setFeedback(""), 2000);
    });
  }

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          {isLive && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />}
          <span className={cn("relative inline-flex h-3 w-3 rounded-full", isLive ? "bg-accent" : "bg-subtle/50")} />
        </span>
        <h3 className="font-mono text-sm uppercase tracking-widest text-ink font-semibold">
          Live Match Cockpit
        </h3>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6 rounded-xl border border-line/10 bg-bg p-8">
        
        {/* We use hidden inputs so the overarching form submission saves the final state. */}
        <input type="hidden" name="scoreA" value={liveA} />
        <input type="hidden" name="scoreB" value={liveB} />
        <input type="hidden" name="status" value={liveStatus} />
        <input type="hidden" name="events" value={JSON.stringify(liveEvents)} />

        {/* Team A */}
        <div className="flex flex-1 flex-col items-center gap-2">
          <span className="kicker text-subtle text-center">{teamAName}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pending || isFinished}
              onClick={() => setScore(Math.max(0, liveA - 1), liveB, isLive ? "live" : "scheduled")}
              className="grid h-10 w-10 place-items-center rounded-full border border-line/15 text-muted hover:border-line/40 hover:text-ink disabled:opacity-30"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="display text-6xl tabular-nums text-ink">{liveA}</span>
            <button
              type="button"
              disabled={pending || isFinished}
              onClick={() => setScore(liveA + 1, liveB, isLive ? "live" : "scheduled")}
              className="grid h-10 w-10 place-items-center rounded-full border border-line/15 text-muted hover:border-line/40 hover:text-ink disabled:opacity-30"
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
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="display text-6xl tabular-nums text-ink">{liveB}</span>
            <button
              type="button"
              disabled={pending || isFinished}
              onClick={() => setScore(liveA, liveB + 1, isLive ? "live" : "scheduled")}
              className="grid h-10 w-10 place-items-center rounded-full border border-line/15 text-muted hover:border-line/40 hover:text-ink disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Status controls */}
      <div className="flex flex-wrap items-center gap-3 mt-6">
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
        <button
          type="button"
          disabled={pending}
          onClick={toggleDisplaySwap}
          className="inline-flex items-center gap-2 rounded-full border border-line/15 bg-surface-2 px-4 py-2 text-sm font-semibold text-muted hover:border-line/40 hover:text-ink disabled:opacity-50"
          title="Swaps team names (A and B) on the big screen display"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Swap Screen Sides
        </button>
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
      <div className="space-y-3 mt-6">
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
                <span className={cn("h-2 w-2 rounded-full shrink-0", ev.team === "a" ? "bg-sky-400" : ev.team === "b" ? "bg-rose-400" : "bg-purple-400")} />
                <span className="font-medium text-ink capitalize">{ev.type.replace('_', ' ')}</span>
                {ev.description && <span className="text-muted truncate">· {ev.description}</span>}
                <span className="ml-auto text-xs text-subtle shrink-0">
                  {ev.type === "swap_display" ? "System" : ev.team === "a" ? teamAName : teamBName}
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

        {/* Add event */}
        <div className="grid gap-3 rounded-xl border border-line/15 bg-surface-2 p-4 sm:grid-cols-[auto_auto_auto_1fr_auto]">
          <input
            type="text"
            placeholder="23'"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitEvent(); } }}
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
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitEvent(); } }}
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
