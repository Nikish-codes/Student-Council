import { SportsCompetitionResult } from "@/components/sections/sports-competition-result";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Picture } from "@/components/ui/picture";
import { SportsMatchCard } from "@/components/sections/sports-match-card";
import {
  getSportsTournament,
  getSportsTournaments,
  getSportsMatches,
} from "@/lib/content";
import {
  SPORT_LABELS,
  SPORT_DIVISION_LABELS,
  type SportType,
} from "@/lib/schemas";

export const revalidate = 60;

export async function generateStaticParams() {
  const tournaments = await getSportsTournaments();
  return tournaments.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await getSportsTournament(slug);
  if (!t) return {};
  return {
    title: t.title,
    description:
      t.excerpt || `${t.title} — ${SPORT_LABELS[t.sport]} tournament`,
  };
}

export default async function TournamentDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = await getSportsTournament(slug);
  if (!tournament) notFound();

  const matches = await getSportsMatches({ tournamentId: tournament.id });
  const scheduled = matches.filter((m) => m.status === "scheduled");
  const live = matches.filter((m) => m.status === "live");
  const finished = matches.filter((m) => m.status === "finished");
  const cancelled = matches.filter((m) => m.status === "cancelled");

  return (
    <div>
      {/* Banner */}
      <section className="relative h-[50vh] min-h-[400px] w-full overflow-hidden flex items-center justify-center bg-surface/30">
        <Picture
          src={tournament.banner}
          alt=""
          fill
          sizes="100vw"
          className="scale-125 object-cover opacity-25 blur-2xl pointer-events-none"
          priority
        />
        <Picture
          src={tournament.banner}
          alt={tournament.title}
          fill
          sizes="100vw"
          fallbackLabel={
            SPORT_LABELS[tournament.sport as SportType] ?? tournament.sport
          }
          className="object-contain p-4 sm:p-8"
          priority
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
      </section>

      {/* Header */}
      <section className="container relative z-10 -mt-32 pb-10 sm:-mt-40">
        <Link
          href="/sports/tournaments"
          className="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-[0.2em] text-muted hover:text-ink"
        >
          ← All tournaments
        </Link>
        <span className="kicker mt-6 block text-accent">
          {SPORT_LABELS[tournament.sport as SportType] ?? tournament.sport}
          {tournament.division !== "open" &&
            ` · ${SPORT_DIVISION_LABELS[tournament.division]}`}
        </span>
        <h1 className="display mt-4 text-balance text-5xl sm:text-7xl">
          {tournament.title}
        </h1>
        {tournament.excerpt && (
          <p className="mt-4 max-w-2xl text-balance text-lg text-muted">
            {tournament.excerpt}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 font-mono text-xs uppercase tracking-[0.18em] text-subtle">
          <span>{tournament.year}</span>
          {tournament.venue && <span>{tournament.venue}</span>}
          {tournament.startDate && (
            <span>
              {new Date(tournament.startDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
              {tournament.endDate &&
                ` → ${new Date(tournament.endDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                })}`}
            </span>
          )}
        </div>
      </section>

      {/* Description */}
      {tournament.description && (
        <section className="container mb-16">
          <div className="max-w-2xl text-pretty leading-relaxed text-muted">
            {tournament.description.split("\n").map((p, i) => (
              <p key={i} className={i > 0 ? "mt-4" : ""}>
                {p}
              </p>
            ))}
          </div>
        </section>
      )}

      <SportsCompetitionResult result={tournament.result} />
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
            <span className="kicker mb-4 block text-subtle">Results</span>
            <div className="grid gap-5 2xl:grid-cols-2">
              {finished.map((m) => (
                <SportsMatchCard key={m.id} match={m} />
              ))}
            </div>
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

        {matches.length === 0 && !tournament.result?.winnerName && (
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
