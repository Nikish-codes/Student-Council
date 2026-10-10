"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ArrowLeftRight,
  Flag,
  Minus,
  Plus,
  RotateCcw,
  Radio,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CelebrationStyle,
  SportDisplayOverlay,
  SportMatchEvent,
  SportMatchTimer,
} from "@/lib/schemas";
import { readMatchClock } from "@/lib/sports-clock";
import { eventLabel, HALT_PRESETS } from "@/lib/sports-display";
import {
  addMatchEvent,
  logMatchEvent,
  removeMatchEvent,
  removeMatchEventById,
  replayMatchEvent,
  setMatchGoalStyle,
  setMatchOverlay,
  updateMatchScore,
  type MatchEventInput,
} from "../actions";

type Props = {
  matchId: number;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  status: "cancelled" | "scheduled" | "live" | "finished";
  events: SportMatchEvent[];
  timer?: SportMatchTimer;
  overlay?: SportDisplayOverlay;
  goalStyle?: CelebrationStyle;
};

type Draft = {
  player: string;
  jersey: string;
  assist: string;
  style: "default" | CelebrationStyle;
  celebrate: boolean;
};

const EMPTY_DRAFT: Draft = {
  player: "",
  jersey: "",
  assist: "",
  style: "default",
  celebrate: true,
};

const ACTIONS: { type: string; label: string; className?: string }[] = [
  { type: "goal", label: "Goal" },
  { type: "penalty_goal", label: "Penalty" },
  { type: "own_goal", label: "Own goal" },
  { type: "penalty_miss", label: "Pen. miss" },
  {
    type: "yellow",
    label: "Yellow",
    className: "border-amber-400/50 bg-amber-400/10 text-amber-300",
  },
  {
    type: "second_yellow",
    label: "2nd yellow",
    className: "border-orange-500/50 bg-orange-500/10 text-orange-300",
  },
  {
    type: "red",
    label: "Red",
    className: "border-red-500/50 bg-red-500/10 text-red-300",
  },
  { type: "sub", label: "Sub" },
];

function squadNames(events: SportMatchEvent[], team: "a" | "b"): string[] {
  return Array.from(
    new Set(
      events
        .filter((e) => e.team === team && e.player)
        .map((e) => e.player as string),
    ),
  );
}

export function MatchCockpit({
  matchId,
  teamAName,
  teamBName,
  scoreA,
  scoreB,
  status,
  events,
  timer,
  overlay,
  goalStyle,
}: Props) {
  const [liveA, setLiveA] = useState(scoreA);
  const [liveB, setLiveB] = useState(scoreB);
  const [liveStatus, setLiveStatus] = useState(status);
  const [liveEvents, setLiveEvents] = useState(events);
  const [liveOverlay, setLiveOverlay] = useState<SportDisplayOverlay>(
    overlay ?? { kind: "none" },
  );
  const [style, setStyle] = useState<CelebrationStyle>(goalStyle ?? "takeover");
  const [drafts, setDrafts] = useState<Record<"a" | "b", Draft>>({
    a: EMPTY_DRAFT,
    b: EMPTY_DRAFT,
  });
  const [overrideTime, setOverrideTime] = useState("");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const isLive = liveStatus === "live";
  const isFinished = liveStatus === "finished";
  const isNew = Number.isNaN(matchId);

  useEffect(() => {
    if (!timer?.running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer?.running]);

  const clock = readMatchClock(timer, now);
  const stamp = overrideTime.trim() || (clock ? `${clock.minute + 1}'` : "");

  function guard(): boolean {
    if (isNew) {
      alert("Please save this new match first before using live controls!");
      return false;
    }
    return true;
  }

  function run(fn: () => Promise<unknown>, message: string) {
    setFeedback("Updating…");
    startTransition(async () => {
      await fn();
      setFeedback(message);
      setTimeout(() => setFeedback(""), 2000);
    });
  }

  function setScore(a: number, b: number, newStatus: typeof liveStatus) {
    if (!guard()) return;
    setLiveA(a);
    setLiveB(b);
    setLiveStatus(newStatus);
    run(() => updateMatchScore(matchId, a, b, newStatus), "Score saved");
  }

  function logEvent(team: "a" | "b", type: string) {
    if (!guard()) return;
    const draft = drafts[team];
    const input: MatchEventInput = {
      type,
      team,
      time: stamp,
      player: draft.player,
      jersey: draft.jersey,
      assist: draft.assist,
      celebrate: draft.celebrate,
      style: draft.style === "default" ? undefined : draft.style,
    };

    const optimistic: SportMatchEvent = {
      time: input.time ?? "",
      team,
      type,
      player: draft.player || undefined,
      jersey: draft.jersey || undefined,
      assist: draft.assist || undefined,
      celebrate: draft.celebrate,
    };
    setLiveEvents((prev) => [...prev, optimistic]);

    if (type === "goal" || type === "penalty_goal") {
      if (team === "a") setLiveA((v) => v + 1);
      else setLiveB((v) => v + 1);
    } else if (type === "own_goal") {
      if (team === "a") setLiveB((v) => v + 1);
      else setLiveA((v) => v + 1);
    }

    setDrafts((prev) => ({ ...prev, [team]: EMPTY_DRAFT }));
    setOverrideTime("");
    run(() => logMatchEvent(matchId, input), `${eventLabel(type)} logged`);
  }

  function removeEvent(event: SportMatchEvent, index: number) {
    if (!guard()) return;
    setLiveEvents((prev) => prev.filter((_, i) => i !== index));
    run(
      () =>
        event.id
          ? removeMatchEventById(matchId, event.id)
          : removeMatchEvent(matchId, index),
      "Event removed",
    );
  }

  function applyOverlay(next: SportDisplayOverlay, message: string) {
    if (!guard()) return;
    setLiveOverlay(next);
    run(() => setMatchOverlay(matchId, next), message);
  }

  function toggleDisplaySwap() {
    if (!guard()) return;
    const event: SportMatchEvent = {
      time: "SYS",
      team: "a",
      type: "swap_display",
      description: "Display swapped",
    };
    setLiveEvents((prev) => [...prev, event]);
    run(() => addMatchEvent(matchId, event), "Display swapped");
  }

  const visibleEvents = liveEvents.filter((e) => !e.replay);

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          {isLive && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          )}
          <span
            className={cn(
              "relative inline-flex h-3 w-3 rounded-full",
              isLive ? "bg-accent" : "bg-subtle/50",
            )}
          />
        </span>
        <h3 className="font-mono text-sm font-semibold uppercase tracking-widest text-ink">
          Live Match Cockpit
        </h3>
        {clock && (
          <span className="ml-auto font-mono text-sm font-semibold tabular-nums text-muted">
            {clock.label}
          </span>
        )}
      </div>

      <input type="hidden" name="scoreA" value={liveA} />
      <input type="hidden" name="scoreB" value={liveB} />
      <input type="hidden" name="status" value={liveStatus} />
      <input type="hidden" name="events" value={JSON.stringify(liveEvents)} />

      <div className="flex flex-col items-center gap-6 rounded-xl border border-line/10 bg-bg p-8 md:flex-row">
        {(["a", "b"] as const).map((team) => (
          <div key={team} className="flex flex-1 flex-col items-center gap-2">
            <span className="kicker text-center text-subtle">
              {team === "a" ? teamAName : teamBName}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={pending || isFinished}
                onClick={() =>
                  team === "a"
                    ? setScore(Math.max(0, liveA - 1), liveB, liveStatus)
                    : setScore(liveA, Math.max(0, liveB - 1), liveStatus)
                }
                className="grid h-10 w-10 place-items-center rounded-full border border-line/15 text-muted hover:border-line/40 hover:text-ink disabled:opacity-30"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="display text-6xl tabular-nums text-ink">
                {team === "a" ? liveA : liveB}
              </span>
              <button
                type="button"
                disabled={pending || isFinished}
                onClick={() =>
                  team === "a"
                    ? setScore(liveA + 1, liveB, liveStatus)
                    : setScore(liveA, liveB + 1, liveStatus)
                }
                className="grid h-10 w-10 place-items-center rounded-full border border-line/15 text-muted hover:border-line/40 hover:text-ink disabled:opacity-30"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
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
          title="Swaps which team shows on the left of the big screen"
          className="inline-flex items-center gap-2 rounded-full border border-line/15 bg-surface-2 px-4 py-2 text-sm font-semibold text-muted hover:border-line/40 hover:text-ink disabled:opacity-50"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Swap screen sides
        </button>
        <span
          className={cn(
            "inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em]",
            isLive ? "font-semibold text-accent" : "text-subtle",
          )}
        >
          Status: {liveStatus}
        </span>
        {feedback && (
          <span className="ml-auto font-mono text-xs text-accent">
            ✓ {feedback}
          </span>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="kicker text-subtle">Log an event</span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-subtle">
              Minute
              <input
                type="text"
                value={overrideTime}
                onChange={(e) => setOverrideTime(e.target.value)}
                placeholder={stamp || "23'"}
                className="w-20 rounded-lg border border-line/15 bg-bg px-2 py-1.5 text-center text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-subtle">
              Celebration
              <select
                value={style}
                onChange={(e) => {
                  const next = e.target.value as CelebrationStyle;
                  setStyle(next);
                  if (!isNew) {
                    run(
                      () => setMatchGoalStyle(matchId, next),
                      "Celebration style saved",
                    );
                  }
                }}
                className="rounded-lg border border-line/15 bg-bg px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
              >
                <option value="takeover">Full takeover</option>
                <option value="flourish">Scoreboard flourish</option>
              </select>
            </label>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {(["a", "b"] as const).map((team) => {
            const draft = drafts[team];
            const name = team === "a" ? teamAName : teamBName;
            const listId = `squad-${team}-${matchId}`;
            const update = (patch: Partial<Draft>) =>
              setDrafts((prev) => ({
                ...prev,
                [team]: { ...prev[team], ...patch },
              }));

            return (
              <div
                key={team}
                className="rounded-xl border border-line/15 bg-surface-2 p-4"
              >
                <p className="mb-3 truncate text-sm font-semibold text-ink">
                  {name}
                </p>

                <datalist id={listId}>
                  {squadNames(liveEvents, team).map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>

                <div className="grid grid-cols-[1fr_72px] gap-2">
                  <input
                    list={listId}
                    value={draft.player}
                    onChange={(e) => update({ player: e.target.value })}
                    placeholder="Player name"
                    className="rounded-lg border border-line/15 bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                  <input
                    value={draft.jersey}
                    onChange={(e) => update({ jersey: e.target.value })}
                    placeholder="No."
                    inputMode="numeric"
                    className="rounded-lg border border-line/15 bg-bg px-3 py-2 text-center font-mono text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>
                <input
                  value={draft.assist}
                  onChange={(e) => update({ assist: e.target.value })}
                  placeholder="Assist (optional)"
                  className="mt-2 w-full rounded-lg border border-line/15 bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                />

                <label className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-subtle">
                  <input
                    type="checkbox"
                    checked={draft.celebrate}
                    onChange={(e) => update({ celebrate: e.target.checked })}
                    className="h-4 w-4 accent-current"
                  />
                  Animate on the big screen
                </label>

                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {ACTIONS.map((action) => (
                    <button
                      key={action.type}
                      type="button"
                      disabled={pending}
                      onClick={() => logEvent(team, action.type)}
                      className={cn(
                        "rounded-lg border border-line/15 px-2 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted transition-colors hover:border-line/40 hover:text-ink disabled:opacity-40",
                        action.className,
                      )}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <span className="kicker text-subtle">Big screen cards</span>
        <div className="flex flex-wrap gap-2">
          {HALT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={pending}
              onClick={() =>
                applyOverlay(
                  {
                    kind: "halt",
                    preset: preset.id,
                    title: preset.title,
                    subtitle: preset.subtitle,
                    since: Date.now(),
                  },
                  preset.subtitle,
                )
              }
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-40"
            >
              {preset.subtitle}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              applyOverlay(
                { kind: "kickoff", title: "Kick Off", subtitle: "" },
                "Kick off",
              )
            }
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
          >
            Kick off
          </button>
          {(
            [
              ["halftime", "Half Time"],
              ["fulltime", "Full Time"],
            ] as const
          ).map(([kind, title]) => (
            <button
              key={kind}
              type="button"
              disabled={pending}
              onClick={() =>
                applyOverlay(
                  {
                    kind,
                    title,
                    subtitle: `${teamAName} ${liveA} — ${liveB} ${teamBName}`,
                  },
                  title,
                )
              }
              className="rounded-lg border border-line/15 bg-surface-2 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted hover:border-line/40 hover:text-ink disabled:opacity-40"
            >
              {title}
            </button>
          ))}
          <button
            type="button"
            disabled={pending || liveOverlay.kind === "none"}
            onClick={() => applyOverlay({ kind: "none" }, "Screen cleared")}
            className="ml-auto rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/20 disabled:opacity-40"
          >
            Clear screen
          </button>
        </div>
        {liveOverlay.kind !== "none" && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-amber-300">
            On screen now: {liveOverlay.title}
            {liveOverlay.subtitle ? ` — ${liveOverlay.subtitle}` : ""}
          </p>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="kicker text-subtle">Event feed</span>
          {visibleEvents.length > 0 && (
            <span className="font-mono text-[11px] text-muted">
              {visibleEvents.length} event
              {visibleEvents.length > 1 ? "s" : ""} logged
            </span>
          )}
        </div>

        {visibleEvents.length > 0 ? (
          <div className="divide-y divide-line/10 rounded-xl border border-line/15 bg-surface/30">
            {liveEvents.map((event, index) =>
              event.replay ? null : (
                <div
                  key={event.id ?? index}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="font-mono text-xs font-semibold tabular-nums text-subtle">
                    {event.time}
                  </span>
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      event.team === "a" ? "bg-sky-400" : "bg-rose-400",
                    )}
                  />
                  <span className="font-medium text-ink">
                    {eventLabel(event.type)}
                  </span>
                  {(event.player || event.description) && (
                    <span className="truncate text-muted">
                      · {event.player ?? event.description}
                      {event.jersey ? ` [${event.jersey}]` : ""}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-xs text-subtle">
                    {event.type === "swap_display"
                      ? "System"
                      : event.team === "a"
                        ? teamAName
                        : teamBName}
                  </span>
                  {event.id && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => replayMatchEvent(matchId, event.id as string),
                          "Replayed",
                        )
                      }
                      title="Play this animation again on the big screen"
                      className="rounded-lg p-1 text-subtle transition-colors hover:bg-line/10 hover:text-ink disabled:opacity-30"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => removeEvent(event, index)}
                    title="Remove event"
                    className="rounded-lg p-1 text-subtle transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            )}
          </div>
        ) : (
          <p className="text-xs text-subtle">No events logged yet.</p>
        )}
      </div>
    </div>
  );
}
