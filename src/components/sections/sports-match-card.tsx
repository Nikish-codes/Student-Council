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
  finished: "Full time",
  cancelled: "Cancelled",
};

export function SportsMatchCard({ match }: { match: SportsMatch }) {
  const matchTime = formatSportsMatchTime(match.matchDate);
  const hasScore = match.status === "live" || match.status === "finished";
  const teamAName = match.teamAName || "Team to be confirmed";
  const teamBName = match.teamBName || "Team to be confirmed";

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-surface/40 ${
        match.status === "live" ? "border-accent/50" : "border-line/10"
      }`}
    >
      <header className="flex items-start justify-between gap-5 border-b border-line/10 px-5 py-4 sm:px-7 sm:py-5">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
            {SPORT_LABELS[match.sport]}
          </p>
          {match.competitionTitle ? (
            match.competitionHref ? (
              <Link
                href={match.competitionHref}
                className="mt-1 block truncate text-sm font-medium text-ink underline decoration-line/30 underline-offset-4 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-base"
              >
                {match.competitionTitle}
              </Link>
            ) : (
              <p className="mt-1 truncate text-sm font-medium text-muted sm:text-base">
                {match.competitionTitle}
              </p>
            )
          ) : (
            <p className="mt-1 text-sm font-medium text-muted sm:text-base">
              Friendly match
            </p>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] ${
            match.status === "live"
              ? "bg-accent/10 text-accent"
              : "bg-surface-2 text-muted"
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

      <div className="grid grid-cols-[minmax(0,1fr)_4.75rem_minmax(0,1fr)] items-center gap-3 px-5 py-8 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)] sm:gap-6 sm:px-8 sm:py-10">
        <TeamIdentity name={teamAName} logo={match.teamALogo} />

        <div className="text-center">
          {match.round ? (
            <p className="mb-3 line-clamp-2 text-xs font-medium uppercase tracking-[0.08em] text-muted sm:text-sm">
              {match.round}
            </p>
          ) : null}
          {hasScore ? (
            <p
              className="font-mono text-4xl font-semibold leading-none tracking-tightest tabular-nums text-ink sm:text-5xl"
              aria-label={`${teamAName} ${match.scoreA ?? 0}, ${teamBName} ${match.scoreB ?? 0}`}
            >
              <span aria-hidden="true">
                {match.scoreA ?? 0}
                <span className="mx-1 text-subtle sm:mx-2">:</span>
                {match.scoreB ?? 0}
              </span>
            </p>
          ) : (
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.12em] text-subtle sm:text-base">
              vs
            </p>
          )}
        </div>

        <TeamIdentity name={teamBName} logo={match.teamBLogo} />
      </div>

      <footer className="grid bg-surface-2/60 sm:grid-cols-2">
        <div className="px-5 py-4 sm:px-7 sm:py-5">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-subtle">
            Kick-off
          </p>
          <p className="mt-1 text-sm font-medium text-muted sm:text-base">
            <time dateTime={match.matchDate}>
              {formatSportsMatchDate(match.matchDate)}
            </time>
            {matchTime ? <span> · {matchTime}</span> : null}
          </p>
        </div>
        <div className="border-t border-line/10 px-5 py-4 sm:border-l sm:border-t-0 sm:px-7 sm:py-5">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-subtle">
            Venue
          </p>
          <p className="mt-1 truncate text-sm font-medium text-muted sm:text-base">
            {match.venue || "To be announced"}
          </p>
        </div>
      </footer>
    </article>
  );
}

function TeamIdentity({ name, logo }: { name: string; logo: string }) {
  const isUnconfirmed = name === "Team to be confirmed";
  return (
    <div className="flex min-w-0 flex-col items-center gap-3 sm:gap-4">
      <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-2 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-subtle sm:h-16 sm:w-16">
        {logo ? (
          <Image
            src={logo}
            alt=""
            fill
            sizes="64px"
            className="object-contain p-2"
          />
        ) : (
          <span aria-hidden="true">
            {isUnconfirmed ? "TBC" : name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <p className="line-clamp-3 min-w-0 max-w-48 text-center text-sm font-semibold leading-snug text-ink sm:text-lg">
        {name}
      </p>
    </div>
  );
}
