"use client";

import { useTransition, useState } from "react";
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
  const [pending, start] = useTransition();
  const [liveA, setLiveA] = useState(scoreA);
  const [liveB, setLiveB] = useState(scoreB);
  const [eventTime, setEventTime] = useState("");
  const [eventTeam, setEventTeam] = useState<"a" | "b">("a");
  const [eventType, setEventType] = useState("goal");
  const [eventDesc, setEventDesc] = useState("");

  const isLive = status === "live";
  const isFinished = status === "finished";

  function setScore(a: number, b: number, newStatus: SportMatchStatus) {
    setLiveA(a);
    setLiveB(b);
    start(() => updateMatchScore(matchId, a, b, newStatus));
  }

  function submitEvent(e: React.FormEvent) {
    e.preventDefault();
    const ev: SportMatchEvent = {
      time: eventTime || "—",
      team: eventTeam,
      type: eventType,
      description: eventDesc || undefined,
    };
    start(() => addMatchEvent(matchId, ev));
    setEventTime("");
    setEventDesc("");
  }

  return (
    <div className="space-y-6">
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
          <span className="kicker text-subtle">{teamAName}</span>
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
          <span className="kicker text-subtle">{teamBName}</span>
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
      <div className="flex gap-3">
        {!isLive && !isFinished && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setScore(liveA, liveB, "live")}
            className="inline-flex items-center gap-2 rounded-full border border-accent/40 px-4 py-2 text-sm text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
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
            className="inline-flex items-center gap-2 rounded-full border border-line/15 px-4 py-2 text-sm text-muted hover:border-line/40 hover:text-ink disabled:opacity-50"
          >
            <Flag className="h-4 w-4" />
            Finish match
          </button>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-2 self-center font-mono text-xs uppercase tracking-[0.2em]",
            isLive ? "text-accent" : isFinished ? "text-subtle" : "text-subtle",
          )}
        >
          {isLive && <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />}
          {status}
        </span>
      </div>

      {/* Event feed */}
      <div className="space-y-3">
        <span className="kicker text-subtle">Event feed</span>
        {events.length > 0 ? (
          <div className="divide-y divide-line/10 rounded-xl border border-line/15">
            {events.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="font-mono text-xs tabular-nums text-subtle">{ev.time}</span>
                <span className={cn("h-2 w-2 rounded-full", ev.team === "a" ? "bg-sky-300" : "bg-rose-300")} />
                <span className="font-medium text-ink">{ev.type}</span>
                {ev.description && <span className="text-muted">· {ev.description}</span>}
                <span className="ml-auto text-subtle">
                  {ev.team === "a" ? teamAName : teamBName}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => start(() => removeMatchEvent(matchId, i))}
                  className="rounded-lg p-1 text-subtle hover:text-red-400 disabled:opacity-30"
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
        <form onSubmit={submitEvent} className="grid gap-3 rounded-xl border border-line/15 bg-surface-2 p-4 sm:grid-cols-[auto_auto_auto_1fr_auto]">
          <input
            type="text"
            placeholder="23'"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            className="w-20 rounded-lg border border-line/15 bg-bg px-3 py-2 text-sm"
          />
          <select
            value={eventTeam}
            onChange={(e) => setEventTeam(e.target.value as "a" | "b")}
            className="rounded-lg border border-line/15 bg-bg px-3 py-2 text-sm"
          >
            <option value="a">{teamAName}</option>
            <option value="b">{teamBName}</option>
          </select>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="rounded-lg border border-line/15 bg-bg px-3 py-2 text-sm"
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
            className="rounded-lg border border-line/15 bg-bg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full border border-line/15 px-4 py-2 text-xs text-ink hover:border-line/40 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
