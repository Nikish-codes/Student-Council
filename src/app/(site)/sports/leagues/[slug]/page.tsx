import { SportsCompetitionResult } from "@/components/sections/sports-competition-result";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Picture } from "@/components/ui/picture";
import { SportsMatchCard } from "@/components/sections/sports-match-card";
import {
  getSportsLeague,
  getSportsLeagues,
  getSportsMatches,
} from "@/lib/content";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import {
  SPORT_LABELS,
  SPORT_DIVISION_LABELS,
  type SportType,
} from "@/lib/schemas";

export const revalidate = 60;

export async function generateStaticParams() {
  const leagues = await getSportsLeagues();
  return leagues.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const l = await getSportsLeague(slug);
  if (!l) return {};
  return {
    title: l.title,
    description: l.excerpt || `${l.title} — ${SPORT_LABELS[l.sport]} league`,
  };
}

export default async function LeagueDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const league = await getSportsLeague(slug);
  if (!league) notFound();

  const matches = await getSportsMatches({ leagueId: league.id });
  const scheduled = matches.filter((m) => m.status === "scheduled");
  const live = matches.filter((m) => m.status === "live");
  const finished = matches.filter((m) => m.status === "finished");
  const cancelled = matches.filter((m) => m.status === "cancelled");

  const finishedByRound = finished.reduce<Record<string, typeof finished>>(
    (acc, match) => {
      const roundKey = match.round || "Other";
      if (!acc[roundKey]) acc[roundKey] = [];
      acc[roundKey].push(match);
      return acc;
    },
    {}
  );

  return (
    <div>
      {live.length > 0 && <AutoRefresh intervalMs={10000} />}
      {/* Banner */}
      <section className="relative h-[50vh] min-h-[400px] w-full overflow-hidden flex items-center justify-center bg-surface/30">
        <Picture
          src={league.banner}
          alt=""
          fill
          sizes="100vw"
          className="scale-125 object-cover opacity-25 blur-2xl pointer-events-none"
          priority
        />
        <Picture
          src={league.banner}
          alt={league.title}
          fill
          sizes="100vw"
          fallbackLabel={
            SPORT_LABELS[league.sport as SportType] ?? league.sport
          }
          className="object-contain p-4 sm:p-8"
          priority
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
      </section>

      {/* Header */}
      <section className="container relative z-10 -mt-32 pb-10 sm:-mt-40">
        <Link
          href="/sports/leagues"
          className="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-[0.2em] text-muted hover:text-ink"
        >
          ← All leagues
        </Link>
        <span className="kicker mt-6 block text-accent">
          {SPORT_LABELS[league.sport as SportType] ?? league.sport}
          {league.division !== "open" &&
            ` · ${SPORT_DIVISION_LABELS[league.division]}`}
        </span>
        <h1 className="display mt-4 text-balance text-5xl sm:text-7xl">
          {league.title}
        </h1>
        {league.excerpt && (
          <p className="mt-4 max-w-2xl text-balance text-lg text-muted">
            {league.excerpt}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 font-mono text-xs uppercase tracking-[0.18em] text-subtle">
          <span>{league.year}</span>
          {league.venue && <span>{league.venue}</span>}
          {league.startDate && (
            <span>
              {new Date(league.startDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
              {league.endDate &&
                ` → ${new Date(league.endDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                })}`}
            </span>
          )}
        </div>
      </section>

      {/* Description */}
      {league.description && (
        <section className="container mb-16">
          <div className="max-w-2xl text-pretty leading-relaxed text-muted">
            {league.description.split("\n").map((p, i) => (
              <p key={i} className={i > 0 ? "mt-4" : ""}>
                {p}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Standings */}
      {league.standings.length > 0 && (
        <section className="container mb-16">
          <div className="mb-10 border-b border-line/10 pb-10">
            <h2 className="display text-3xl sm:text-4xl">Standings</h2>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-line/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line/10 bg-surface/40">
                  <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.18em] text-subtle">
                    Pos
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.18em] text-subtle">
                    {league.result?.participantType === "people"
                      ? "Player"
                      : "Team"}
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-[0.18em] text-subtle">
                    P
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-[0.18em] text-subtle">
                    W
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-[0.18em] text-subtle">
                    L
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-[0.18em] text-subtle">
                    D
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-[0.18em] text-subtle">
                    Pts
                  </th>
                </tr>
              </thead>
              <tbody>
                {league.standings.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-line/5 transition-colors hover:bg-surface/20"
                  >
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {row.position ?? i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {row.teamName}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-muted">
                      {row.played}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-muted">
                      {row.won}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-muted">
                      {row.lost}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-muted">
                      {row.drawn}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold tabular-nums text-ink">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <SportsCompetitionResult
        result={league.result}
        competitionTitle={league.title}
      />
      {/* Matches */}
      <section className="container pb-32">
        <div className="mb-10 border-b border-line/10 pb-10">
          <h2 className="display text-3xl sm:text-4xl">Matches</h2>
        </div>

        {live.length > 0 && (
          <div className="mb-12">
            <span className="kicker mb-4 block text-accent">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Live now
            </span>
            <div className="grid gap-5 2xl:grid-cols-2">
              {live.map((m) => (
                <SportsMatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        )}

        {scheduled.length > 0 && (
          <div className="mb-12">
            <span className="kicker mb-4 block text-subtle">Upcoming</span>
            <div className="grid gap-5 2xl:grid-cols-2">
              {scheduled.map((m) => (
                <SportsMatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        )}

        {finished.length > 0 && (
          <div className="mb-12">
            <span className="kicker mb-6 block text-subtle">Results</span>
            {Object.keys(finishedByRound).length === 1 &&
            Object.keys(finishedByRound)[0] === "Other" ? (
              <div className="grid gap-5 2xl:grid-cols-2">
                {finished.map((m) => (
                  <SportsMatchCard key={m.id} match={m} />
                ))}
              </div>
            ) : (
              <div className="space-y-10">
                {Object.entries(finishedByRound).map(
                  ([roundName, roundMatches]) => (
                    <div key={roundName}>
                      <div className="mb-4 flex items-center justify-between border-b border-line/10 pb-2">
                        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-ink sm:text-sm">
                          {roundName}
                        </h3>
                        <span className="font-mono text-[11px] text-subtle">
                          {roundMatches.length}{" "}
                          {roundMatches.length === 1 ? "match" : "matches"}
                        </span>
                      </div>
                      <div className="grid gap-5 2xl:grid-cols-2">
                        {roundMatches.map((m) => (
                          <SportsMatchCard key={m.id} match={m} />
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {cancelled.length > 0 && (
          <div>
            <span className="kicker mb-4 block text-subtle">Cancelled</span>
            <div className="grid gap-5 2xl:grid-cols-2">
              {cancelled.map((m) => (
                <SportsMatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        )}

        {matches.length === 0 && !league.result?.winnerName && (
          <div className="border-y border-line/10 py-20 text-center">
            <p className="display text-xl text-muted">
              No matches scheduled yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
