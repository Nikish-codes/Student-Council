"use client";

import type { SportsMatch } from "@/lib/content";
import type { SportMatchEvent } from "@/lib/schemas";
import { eventMinute, useMatchClock } from "@/lib/sports-clock";
import { useLiveMatch } from "@/lib/use-live-scores";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  goal: "Goal",
  own_goal: "Own goal",
  penalty_goal: "Penalty",
  penalty_miss: "Penalty missed",
  yellow: "Yellow card",
  second_yellow: "Second yellow",
  red: "Red card",
  sub: "Substitution",
  save: "Save",
  timeout: "Timeout",
  other: "Event",
};

const HIDDEN = new Set(["swap_display"]);

function label(type: string) {
  return LABELS[type] ?? type.replace(/_/g, " ");
}

function Marker({ type }: { type: string }) {
  if (type === "yellow" || type === "red" || type === "second_yellow") {
    const two = type === "second_yellow";
    return (
      <span className="relative flex h-5 w-5 items-center justify-center">
        {two && (
          <span className="absolute h-4 w-3 -translate-x-1 -rotate-12 rounded-[2px] bg-amber-400" />
        )}
        <span
          className={cn(
            "absolute h-4 w-3 rounded-[2px]",
            type === "yellow" ? "bg-amber-400" : "bg-red-500",
            two && "translate-x-1 rotate-6",
          )}
        />
      </span>
    );
  }

  if (type === "goal" || type === "penalty_goal" || type === "own_goal") {
    return (
      <span className="flex h-5 w-5 items-center justify-center">
        <span className="h-3.5 w-3.5 rounded-full border-[2.5px] border-ink bg-surface" />
      </span>
    );
  }

  return (
    <span className="flex h-5 w-5 items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-subtle" />
    </span>
  );
}

function Row({
  event,
  teamName,
  side,
}: {
  event: SportMatchEvent;
  teamName: string;
  side: "left" | "right";
}) {
  const right = side === "right";
  const detail =
    event.player || event.description || "";
  const extra = [
    event.jersey ? `#${event.jersey}` : "",
    event.assist ? `assist ${event.assist}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2.5">
      <div className={cn("min-w-0", right ? "col-start-3 text-left" : "col-start-1 text-right")}>
        <p className="truncate text-sm font-semibold text-ink">
          {detail || label(event.type)}
        </p>
        <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
          {detail ? label(event.type) : teamName}
          {extra ? ` · ${extra}` : ""}
        </p>
      </div>

      <div className="col-start-2 flex flex-col items-center gap-1">
        <Marker type={event.type} />
        <span className="font-mono text-[10px] font-bold tabular-nums text-muted">
          {eventMinute(event.time) > 0 ? `${eventMinute(event.time)}′` : event.time}
        </span>
      </div>
    </li>
  );
}

function Divider({ text }: { text: string }) {
  return (
    <li className="relative my-2 flex items-center justify-center">
      <span className="rounded-full border border-line/10 bg-surface-2 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
        {text}
      </span>
    </li>
  );
}

export function SportsMatchTimeline({ match: initial }: { match: SportsMatch }) {
  const match = useLiveMatch(initial);
  const clock = useMatchClock(match.postMatch?.timer);

  const events = (match.events ?? []).filter((e) => !HIDDEN.has(e.type));
  if (events.length === 0) return null;

  const halfAt = Math.floor((match.postMatch?.timer?.matchDuration || 90) / 2);
  const ordered = [...events].sort((x, y) => eventMinute(x.time) - eventMinute(y.time));
  const first = ordered.filter((e) => eventMinute(e.time) <= halfAt);
  const second = ordered.filter((e) => eventMinute(e.time) > halfAt);

  const teamA = match.teamAName || "Side A";
  const teamB = match.teamBName || "Side B";

  const render = (list: SportMatchEvent[]) =>
    list.map((event, i) => (
      <Row
        key={`${event.time}-${event.type}-${event.team}-${i}`}
        event={event}
        teamName={event.team === "a" ? teamA : teamB}
        side={event.team === "a" ? "left" : "right"}
      />
    ));

  return (
    <section className="rounded-2xl border border-line/10 bg-surface/40 p-5 sm:p-8">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="display text-xl text-ink sm:text-2xl">Timeline</h2>
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
          {teamA} <span className="text-line/25">/</span> {teamB}
        </span>
      </div>

      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line/10"
        />
        <ul className="relative">
          {render(first)}
          {second.length > 0 && <Divider text="Half time" />}
          {render(second)}
          {match.status === "finished" && <Divider text="Full time" />}
          {match.status === "live" && clock && !clock.atFullTime && (
            <li className="relative flex items-center justify-center pt-3">
              <span className="flex items-center gap-2 rounded-full border border-accent/25 bg-accent/5 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
                {clock.label} — in play
              </span>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
