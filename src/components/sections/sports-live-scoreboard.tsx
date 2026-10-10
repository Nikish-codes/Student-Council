"use client";

import Image from "next/image";
import type { SportsMatch } from "@/lib/content";
import { SPORT_LABELS, type SportMatchEvent } from "@/lib/schemas";
import { eventMinute, useMatchClock } from "@/lib/sports-clock";
import {
  formatSportsMatchDate,
  formatSportsMatchTime,
} from "@/lib/sports-match";
import { useLiveMatch } from "@/lib/use-live-scores";
import { cn } from "@/lib/utils";

const SCORING = new Set(["goal", "own_goal", "penalty_goal"]);

function scorerLines(events: SportMatchEvent[], team: "a" | "b") {
  const order: string[] = [];
  const minutes = new Map<string, string[]>();

  for (const ev of events) {
    if (!SCORING.has(ev.type)) continue;
    const creditedTo = ev.type === "own_goal" ? (ev.team === "a" ? "b" : "a") : ev.team;
    if (creditedTo !== team) continue;

    const name = ev.player || ev.description || "Unknown";
    const label =
      eventMinute(ev.time) > 0 ? `${eventMinute(ev.time)}′` : ev.time;
    const suffix = ev.type === "own_goal" ? " (OG)" : ev.type === "penalty_goal" ? " (P)" : "";
    const key = name + suffix;
    if (!minutes.has(key)) {
      minutes.set(key, []);
      order.push(key);
    }
    minutes.get(key)!.push(label);
  }

  return order.map((name) => ({ name, minutes: minutes.get(name)!.join(", ") }));
}

function Side({
  name,
  logo,
  scorers,
  align,
  dim,
}: {
  name: string;
  logo: string;
  scorers: { name: string; minutes: string }[];
  align: "left" | "right";
  dim: boolean;
}) {
  const right = align === "right";
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3",
        right ? "items-center sm:items-end" : "items-center sm:items-start",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-3",
          right && "sm:flex-row-reverse",
        )}
      >
        <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 sm:h-16 sm:w-16">
          {logo ? (
            <Image src={logo} alt="" fill sizes="64px" className="object-contain p-1" />
          ) : (
            <span className="font-mono text-sm font-bold text-subtle">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <p
          className={cn(
            "min-w-0 text-base font-bold leading-tight sm:text-xl",
            right ? "sm:text-right" : "sm:text-left",
            dim ? "text-ink/55" : "text-ink",
          )}
          title={name}
        >
          {name}
        </p>
      </div>

      {scorers.length > 0 && (
        <ul
          className={cn(
            "hidden space-y-1 sm:block",
            right ? "text-right" : "text-left",
          )}
        >
          {scorers.map((s) => (
            <li
              key={s.name}
              className={cn(
                "flex items-center gap-1.5 text-xs text-subtle",
                right && "flex-row-reverse",
              )}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full border border-current opacity-70"
              />
              <span className="truncate">{s.name}</span>
              <span className="shrink-0 font-mono tabular-nums text-muted">
                {s.minutes}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SportsLiveScoreboard({ match: initial }: { match: SportsMatch }) {
  const match = useLiveMatch(initial);
  const clock = useMatchClock(match.postMatch?.timer);

  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const hasScore = (isLive || isFinished) && match.scoreA != null && match.scoreB != null;

  const a = match.scoreA ?? 0;
  const b = match.scoreB ?? 0;
  const events = match.events ?? [];

  const teamA = match.teamAName || "TBC";
  const teamB = match.teamBName || "TBC";
  const time = formatSportsMatchTime(match.matchDate);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border bg-surface/60",
        isLive ? "border-accent/25" : "border-line/10",
      )}
    >
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line/5 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted sm:px-6">
        <span className="text-ink/70">{SPORT_LABELS[match.sport]}</span>
        {match.competitionTitle && (
          <>
            <span className="text-line/25">/</span>
            <span className="truncate">{match.competitionTitle}</span>
          </>
        )}
        {match.round && (
          <>
            <span className="text-line/25">/</span>
            <span className="truncate">{match.round}</span>
          </>
        )}

        <span className="ml-auto flex items-center gap-2">
          {isLive ? (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              <span className="font-bold tracking-[0.18em] text-accent">
                {clock ? clock.label : "Live"}
              </span>
            </>
          ) : (
            <span className="tracking-[0.18em] text-subtle">
              {isFinished ? "Full time" : match.status === "cancelled" ? "Cancelled" : "Scheduled"}
            </span>
          )}
        </span>
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 px-4 py-6 sm:gap-8 sm:px-8 sm:py-8">
        <Side
          name={teamA}
          logo={match.teamALogo}
          scorers={scorerLines(events, "a")}
          align="left"
          dim={isFinished && a < b}
        />

        <div className="flex flex-col items-center gap-2 pt-1">
          {hasScore ? (
            <p
              className="flex items-center font-mono text-4xl font-black leading-none tracking-tighter tabular-nums text-ink sm:text-6xl"
              aria-label={`${teamA} ${a}, ${teamB} ${b}`}
            >
              <span aria-hidden="true">{a}</span>
              <span aria-hidden="true" className="mx-2 font-normal text-line/25 sm:mx-4">
                :
              </span>
              <span aria-hidden="true">{b}</span>
            </p>
          ) : (
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.25em] text-muted sm:text-base">
              vs
            </p>
          )}

          {isLive && clock?.atHalfTime && (
            <span className="rounded-full bg-surface-2 px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
              Half time
            </span>
          )}
        </div>

        <Side
          name={teamB}
          logo={match.teamBLogo}
          scorers={scorerLines(events, "b")}
          align="right"
          dim={isFinished && b < a}
        />
      </div>

      {isLive && clock && (
        <div className="px-4 pb-4 sm:px-8">
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-line/10">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear"
              style={{ width: `${Math.round(clock.progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      <footer className="flex items-center justify-between gap-3 border-t border-line/5 bg-surface-2/25 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-subtle sm:px-6">
        <span className="flex items-center gap-1.5">
          <time dateTime={match.matchDate}>{formatSportsMatchDate(match.matchDate)}</time>
          {time && (
            <>
              <span className="text-line/25">·</span>
              <span className="text-muted">{time}</span>
            </>
          )}
        </span>
        <span className="truncate pl-2 text-right">{match.venue || "TBA"}</span>
      </footer>
    </section>
  );
}
