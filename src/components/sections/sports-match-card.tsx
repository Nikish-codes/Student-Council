import Image from "next/image";
import Link from "next/link";
import type { SportsMatch } from "@/lib/content";
import {
  formatSportsMatchDate,
  formatSportsMatchTime,
} from "@/lib/sports-match";
import { SPORT_LABELS } from "@/lib/schemas";

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

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-surface/40 transition-colors ${
        match.status === "live" ? "border-accent/50" : "border-line/10"
      }`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-line/10 px-4 py-2.5 sm:px-5 sm:py-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {SPORT_LABELS[match.sport]}
            {match.competitionTitle && (
              <span className="text-subtle">
                {" "}
                ·{" "}
                {match.competitionHref ? (
                  <Link
                    href={match.competitionHref}
                    className="hover:text-ink underline decoration-line/30 underline-offset-2 transition-colors"
                  >
                    {match.competitionTitle}
                  </Link>
                ) : (
                  match.competitionTitle
                )}
              </span>
            )}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${
            match.status === "live"
              ? "bg-accent/10 text-accent font-semibold"
              : "bg-surface-2 text-subtle"
          }`}
        >
          {match.status === "live" ? (
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-pulse"
            />
          ) : null}
          {STATUS_LABELS[match.status]}
        </span>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-4 sm:gap-6 sm:px-6 sm:py-5">
        <TeamIdentity name={teamAName} logo={match.teamALogo} align="left" />

        <div className="px-3 text-center sm:px-5">
          {match.round ? (
            <span className="mb-1 inline-block rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-xs">
              {match.round}
            </span>
          ) : null}
          {hasScore ? (
            <p
              className="font-mono text-2xl font-bold leading-none tracking-tight tabular-nums text-ink sm:text-3xl"
              aria-label={`${teamAName} ${match.scoreA ?? 0}, ${teamBName} ${match.scoreB ?? 0}`}
            >
              <span aria-hidden="true">
                {match.scoreA ?? 0}
                <span className="mx-1 text-subtle sm:mx-1.5">:</span>
                {match.scoreB ?? 0}
              </span>
            </p>
          ) : (
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-subtle sm:text-sm">
              vs
            </p>
          )}
        </div>

        <TeamIdentity name={teamBName} logo={match.teamBLogo} align="right" />
      </div>

      {match.status === "finished" &&
        (match.postMatch.winnerName || match.postMatch.winnerTitle) && (
          <div className="border-t border-line/10 bg-surface-2/30 px-4 py-2 text-xs sm:px-5 sm:py-2.5">
            {match.postMatch.winnerName && (
              <span className="font-medium text-accent">
                Winner: {match.postMatch.winnerName}
                {match.postMatch.winnerTitle && " · "}
              </span>
            )}
            {match.postMatch.winnerTitle && (
              <span className="text-muted font-mono text-[11px]">
                {match.postMatch.winnerTitle}
              </span>
            )}
          </div>
        )}

      <footer className="flex items-center justify-between border-t border-line/10 bg-surface-2/40 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.1em] text-subtle sm:px-5">
        <span>
          <time dateTime={match.matchDate}>
            {formatSportsMatchDate(match.matchDate)}
          </time>
          {matchTime ? ` · ${matchTime}` : ""}
        </span>
        <span>{match.venue || "Sportx"}</span>
      </footer>
    </article>
  );
}

function TeamIdentity({
  name,
  logo,
  align = "left",
}: {
  name: string;
  logo: string;
  align?: "left" | "right";
}) {
  const isUnconfirmed = name === "Participant to be confirmed";
  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 sm:gap-3 ${
        align === "right" ? "flex-row-reverse text-right" : "flex-row text-left"
      }`}
    >
      <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle sm:h-11 sm:w-11">
        {logo ? (
          <Image
            src={logo}
            alt=""
            fill
            sizes="48px"
            className="object-contain p-1.5"
          />
        ) : (
          <span aria-hidden="true">
            {isUnconfirmed ? "TBC" : name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <p className="line-clamp-2 min-w-0 text-xs font-semibold leading-snug text-ink sm:text-sm">
        {name}
      </p>
    </div>
  );
}
