import Image from "next/image";
import Link from "next/link";
import type { SportsMatch } from "@/lib/content";
import {
  formatSportsMatchDate,
  formatSportsMatchTime,
} from "@/lib/sports-match";
import { SPORT_LABELS } from "@/lib/schemas";

import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<SportsMatch["status"], string> = {
  scheduled: "Scheduled",
  live: "Live",
  finished: "Finished",
  cancelled: "Cancelled",
};

export function SportsMatchCard({ match }: { match: SportsMatch }) {
  const matchTime = formatSportsMatchTime(match.matchDate);
  const hasScore =
    (match.status === "live" || match.status === "finished") &&
    match.scoreA != null &&
    match.scoreB != null;
  const teamAName = match.teamAName || "Participant to be confirmed";
  const teamBName = match.teamBName || "Participant to be confirmed";
  const isLive = match.status === "live";

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border transition-all",
        isLive
          ? "border-accent/30 bg-surface shadow-[0_0_24px_-12px_rgba(var(--color-accent),0.2)]"
          : "border-line/10 bg-surface/40 hover:border-line/20 hover:bg-surface/60"
      )}
    >
      {/* Banner background for live matches */}
      {match.bannerImage && isLive && (
        <div className="absolute inset-x-0 top-0 h-32 w-full opacity-20 pointer-events-none">
          <Image
            src={match.bannerImage}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/50 to-surface" />
        </div>
      )}

      {/* Header */}
      <header className="relative flex items-center justify-between gap-4 border-b border-line/5 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <span className={isLive ? "text-ink font-semibold" : ""}>
              {SPORT_LABELS[match.sport]}
            </span>
            {match.competitionTitle && (
              <>
                <span className="text-line/30">/</span>
                <span className="truncate text-subtle">
                  {match.competitionHref ? (
                    <Link
                      href={match.competitionHref}
                      className="hover:text-ink transition-colors"
                    >
                      {match.competitionTitle}
                    </Link>
                  ) : (
                    match.competitionTitle
                  )}
                </span>
              </>
            )}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em]",
            isLive
              ? "bg-accent/10 text-accent shadow-[0_0_12px_-4px_rgba(var(--color-accent),0.4)]"
              : match.status === "finished"
                ? "bg-surface-2 text-subtle"
                : "border border-line/10 bg-surface-2/50 text-muted"
          )}
        >
          {isLive && (
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-pulse"
            />
          )}
          {STATUS_LABELS[match.status]}
        </span>
      </header>

      {/* Score & Teams Area */}
      <div className="relative flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6">
        <TeamIdentity name={teamAName} logo={match.teamALogo} align="left" isLive={isLive} />

        <div className="flex flex-col items-center justify-center px-2 sm:px-4 text-center">
          {match.round && (
            <span className="mb-2 rounded bg-line/5 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
              {match.round}
            </span>
          )}
          
          {hasScore ? (
            <p
              className={cn(
                "font-mono tabular-nums leading-none tracking-tighter",
                isLive ? "text-3xl sm:text-4xl text-ink font-black" : "text-2xl sm:text-3xl text-ink font-bold"
              )}
              aria-label={`${teamAName} ${match.scoreA ?? 0}, ${teamBName} ${match.scoreB ?? 0}`}
            >
              <span aria-hidden="true" className="flex items-center">
                <span>{match.scoreA ?? 0}</span>
                <span className="mx-2 text-line/40 font-normal sm:mx-3">:</span>
                <span>{match.scoreB ?? 0}</span>
              </span>
            </p>
          ) : (
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted sm:text-sm">
              vs
            </p>
          )}
        </div>

        <TeamIdentity name={teamBName} logo={match.teamBLogo} align="right" isLive={isLive} />
      </div>

      {/* Post-match winner details */}
      {match.status === "finished" &&
        (match.postMatch.winnerName || match.postMatch.winnerTitle) && (
          <div className="border-t border-line/5 bg-surface-2/30 px-4 py-2.5 text-xs sm:px-5">
            {match.postMatch.winnerName && (
              <span className="font-semibold text-accent">
                Winner: {match.postMatch.winnerName}
                {match.postMatch.winnerTitle && " · "}
              </span>
            )}
            {match.postMatch.winnerTitle && (
              <span className="text-subtle font-medium">
                {match.postMatch.winnerTitle}
              </span>
            )}
          </div>
        )}

      {/* Footer / Meta */}
      <footer className="mt-auto flex items-center justify-between border-t border-line/5 bg-surface-2/20 px-4 py-2.5 text-[11px] font-mono font-medium uppercase tracking-[0.1em] text-subtle sm:px-5">
        <span className="flex items-center gap-1.5">
          <time dateTime={match.matchDate}>
            {formatSportsMatchDate(match.matchDate)}
          </time>
          {matchTime && (
            <>
              <span className="text-line/30">·</span>
              <span className="text-muted">{matchTime}</span>
            </>
          )}
        </span>
        <span className="truncate pl-2 text-right">{match.venue || "TBA"}</span>
      </footer>
    </article>
  );
}

function TeamIdentity({
  name,
  logo,
  align = "left",
  isLive = false,
}: {
  name: string;
  logo: string;
  align?: "left" | "right";
  isLive?: boolean;
}) {
  const isUnconfirmed = name === "Participant to be confirmed";
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 sm:gap-3",
        align === "right" ? "flex-row-reverse text-right" : "flex-row text-left"
      )}
    >
      <div
        className={cn(
          "relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em]",
          isLive ? "h-14 w-14 sm:h-16 sm:w-16 shadow-sm bg-surface" : "h-10 w-10 sm:h-12 sm:w-12 text-subtle"
        )}
      >
        {logo ? (
          <Image
            src={logo}
            alt=""
            fill
            sizes="64px"
            className={cn("object-contain", isLive ? "p-1.5" : "p-2")}
          />
        ) : (
          <span aria-hidden="true">
            {isUnconfirmed ? "TBC" : name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <p
        className={cn(
          "line-clamp-2 min-w-0 leading-tight",
          isLive ? "text-sm sm:text-base font-bold text-ink" : "text-xs sm:text-sm font-semibold text-ink/90"
        )}
      >
        {name}
      </p>
    </div>
  );
}
