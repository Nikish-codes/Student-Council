import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Picture } from "@/components/ui/picture";
import { Reveal } from "@/components/motion/reveal";
import { SportsGallery } from "@/components/sections/sports-gallery";
import { SportsMatchCard } from "@/components/sections/sports-match-card";
import {
  getSportsPageConfig,
  getSportsTournaments,
  getSportsLeagues,
  getSportsMatches,
  getSportsPeople,
  type SportsMatch,
} from "@/lib/content";
import { getSportsMatchYear } from "@/lib/sports-match";
import {
  SPORT_LABELS,
  SPORT_DIVISION_LABELS,
  type SportType,
} from "@/lib/schemas";

export const metadata: Metadata = {
  title: "Sports Academy",
  description:
    "Woxsen Sports Academy — tournaments, leagues, matches, and live scores.",
};

export const revalidate = 60;

export default async function SportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const [
    { year: requestedYear },
    [config, allTournaments, allLeagues, matches, alumni, reps],
  ] = await Promise.all([
    searchParams,
    Promise.all([
      getSportsPageConfig(),
      getSportsTournaments(),
      getSportsLeagues(),
      getSportsMatches(),
      getSportsPeople("alumni"),
      getSportsPeople("representative"),
    ]),
  ]);

  const currentYear = new Date().getFullYear();
  const years = new Set<number>();
  for (const t of allTournaments) years.add(t.year);
  for (const l of allLeagues) years.add(l.year);
  for (const match of matches) {
    years.add(
      match.competitionYear ??
        getSportsMatchYear(match.matchDate) ??
        currentYear,
    );
  }
  const sortedYears = Array.from(years).sort((a, b) => b - a);
  const parsedYear = Number(requestedYear);
  const defaultYear = years.has(currentYear)
    ? currentYear
    : (sortedYears[0] ?? currentYear);
  const selectedYear = years.has(parsedYear) ? parsedYear : defaultYear;
  const tournaments = allTournaments.filter((t) => t.year === selectedYear);
  const leagues = allLeagues.filter((l) => l.year === selectedYear);
  const yearMatches = matches.filter(
    (match) =>
      (match.competitionYear ??
        getSportsMatchYear(match.matchDate) ??
        currentYear) === selectedYear,
  );
  const liveMatches = yearMatches.filter((match) => match.status === "live");
  const upcomingMatches = sortMatches(
    yearMatches.filter((match) => match.status === "scheduled"),
  );

  return (
    <div>
      {/* ─── Top gallery + academy logo ─── */}
      <section className="relative pt-20 sm:pt-24">
        {config.academyLogo ? (
          <div className="container mb-5 flex justify-end sm:mb-6">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-white sm:h-28 sm:w-28">
              <Image
                src={config.academyLogo}
                alt="Woxsen Sports Academy logo"
                fill
                className="object-contain p-1"
                sizes="112px"
                priority
              />
            </div>
          </div>
        ) : null}

        {/* Gallery slideshow — one image at a time, auto-advances, arrow controls */}
        <SportsGallery images={config.galleryImages} />

        {/* Headline — below the gallery */}
        <div className="container relative z-10 pt-12 pb-10 sm:pt-16">
          <Reveal>
            <span className="kicker">Woxsen Sports Academy</span>
            <h1 className="display mt-4 max-w-4xl text-balance text-6xl leading-[0.9] sm:text-8xl">
              Sports.
            </h1>
            {config.tagline && (
              <p className="mt-6 max-w-2xl text-balance text-lg text-muted">
                {config.tagline}
              </p>
            )}
          </Reveal>
        </div>
      </section>

      {/* ─── Year switcher ─── */}
      {sortedYears.length > 0 && (
        <section className="container mb-16">
          <div className="flex flex-wrap items-center gap-2 border-b border-line/10 pb-6">
            <span className="kicker mr-4 text-subtle">Year:</span>
            {sortedYears.map((y) => (
              <Link
                key={y}
                href={y === defaultYear ? "/sports" : `/sports?year=${y}`}
                aria-current={y === selectedYear ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-mono uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  y === selectedYear
                    ? "bg-ink text-bg"
                    : "text-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── Main sports competitions ─── */}
      <section className="container space-y-24 pb-32">
        {/* Live and Upcoming matches ONLY if they exist */}
        {(liveMatches.length > 0 || upcomingMatches.length > 0) && (
          <div>
            <div className="mb-8 flex flex-col gap-4 border-b border-line/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="kicker">Match centre</span>
                <h2 className="display mt-2 text-3xl sm:text-4xl">
                  {liveMatches.length > 0 ? "Live & upcoming" : "Upcoming matches"}
                </h2>
              </div>
              <Link
                href={`/sports/calendar?year=${selectedYear}`}
                className="inline-flex min-h-11 items-center self-start font-mono text-xs uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink sm:self-auto"
              >
                Full calendar →
              </Link>
            </div>
            <div className="space-y-8">
              {liveMatches.length > 0 && (
                <MatchGroup title="Live now" matches={liveMatches} live />
              )}
              {upcomingMatches.length > 0 && (
                <MatchGroup title="Upcoming" matches={upcomingMatches.slice(0, 4)} />
              )}
            </div>
          </div>
        )}

        {/* ─── Leagues (Multi-round) ─── */}
        <div>
          <div className="mb-10 flex items-end justify-between gap-6 border-b border-line/10 pb-10">
            <div>
              <span className="kicker">Multi-round</span>
              <h2 className="display mt-4 text-4xl sm:text-5xl">Leagues</h2>
            </div>
            {leagues.length > 0 && (
              <Link
                href="/sports/leagues"
                className="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-[0.2em] text-muted hover:text-ink"
              >
                All leagues →
              </Link>
            )}
          </div>
          {leagues.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {leagues.slice(0, 6).map((l) => (
                <Link
                  key={l.id}
                  href={`/sports/leagues/${l.slug}`}
                  className="group relative block overflow-hidden rounded-2xl border border-line/10 bg-surface/40 transition-all duration-500 hover:border-line/30 hover:bg-surface/60"
                >
                  <div className="relative aspect-[16/10] overflow-hidden flex items-center justify-center">
                    {/* Ambient backdrop glow */}
                    <Picture
                      src={l.banner}
                      alt=""
                      fill
                      sizes="10vw"
                      fallbackLabel=""
                      className="scale-125 object-cover opacity-25 blur-xl pointer-events-none"
                    />
                    <Picture
                      src={l.banner}
                      alt={l.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      fallbackLabel={
                        SPORT_LABELS[l.sport as SportType] ?? l.sport
                      }
                      className="object-contain p-1.5 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/40 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <span className="kicker text-accent">
                        {SPORT_LABELS[l.sport as SportType] ?? l.sport}
                        {l.division !== "open" &&
                          ` · ${SPORT_DIVISION_LABELS[l.division]}`}
                      </span>
                      <h3 className="display mt-1.5 text-2xl text-ink">
                        {l.title}
                      </h3>
                      {l.result?.winnerName && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-mono text-emerald-300">
                          <span>🏆</span>
                          <span className="uppercase tracking-[0.1em]">
                            Champion: {l.result.winnerName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 font-mono text-xs uppercase tracking-[0.16em] text-subtle">
                    <span>{l.venue ? `${l.venue} · ${l.year}` : l.year}</span>
                    <span className="text-muted transition-colors group-hover:text-accent">
                      {l.standings.length > 0
                        ? `${l.standings.length} teams · View details →`
                        : "View details →"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border-y border-line/10 py-20 text-center">
              <p className="display text-2xl text-muted">
                No leagues announced yet.
              </p>
            </div>
          )}
        </div>

        {/* ─── Tournaments (Single-elimination) ─── */}
        <div>
          <div className="mb-10 flex items-end justify-between gap-6 border-b border-line/10 pb-10">
            <div>
              <span className="kicker">Single-elimination</span>
              <h2 className="display mt-4 text-4xl sm:text-5xl">Tournaments</h2>
            </div>
            {tournaments.length > 0 && (
              <Link
                href="/sports/tournaments"
                className="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-[0.2em] text-muted hover:text-ink"
              >
                All tournaments →
              </Link>
            )}
          </div>
          {tournaments.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.slice(0, 6).map((t) => (
                <Link
                  key={t.id}
                  href={`/sports/tournaments/${t.slug}`}
                  className="group relative block overflow-hidden rounded-2xl border border-line/10 bg-surface/40 transition-all duration-500 hover:border-line/30 hover:bg-surface/60"
                >
                  <div className="relative aspect-[16/10] overflow-hidden flex items-center justify-center">
                    {/* Ambient backdrop glow */}
                    <Picture
                      src={t.banner}
                      alt=""
                      fill
                      sizes="10vw"
                      fallbackLabel=""
                      className="scale-125 object-cover opacity-25 blur-xl pointer-events-none"
                    />
                    <Picture
                      src={t.banner}
                      alt={t.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      fallbackLabel={
                        SPORT_LABELS[t.sport as SportType] ?? t.sport
                      }
                      className="object-contain p-1.5 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/40 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <span className="kicker text-accent">
                        {SPORT_LABELS[t.sport as SportType] ?? t.sport}
                        {t.division !== "open" &&
                          ` · ${SPORT_DIVISION_LABELS[t.division]}`}
                      </span>
                      <h3 className="display mt-1.5 text-2xl text-ink">
                        {t.title}
                      </h3>
                      {t.result?.winnerName && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-mono text-emerald-300">
                          <span>🏆</span>
                          <span className="uppercase tracking-[0.1em]">
                            Champion: {t.result.winnerName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 font-mono text-xs uppercase tracking-[0.16em] text-subtle">
                    <span>
                      {t.startDate
                        ? new Date(t.startDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })
                        : t.year}
                    </span>
                    <span className="text-muted transition-colors group-hover:text-accent">
                      View details →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border-y border-line/10 py-20 text-center">
              <p className="display text-2xl text-muted">
                No tournaments announced yet.
              </p>
            </div>
          )}
        </div>

        {/* Calendar */}
        <div>
          <div className="mb-10 border-b border-line/10 pb-10">
            <span className="kicker">Annual schedule</span>
            <h2 className="display mt-4 text-4xl sm:text-5xl">Calendar</h2>
          </div>
          <Link
            href="/sports/calendar"
            className="group relative block overflow-hidden rounded-2xl border border-line/10 bg-surface/40 transition-all duration-500 hover:border-line/30"
          >
            <div className="flex items-center justify-between p-8 sm:p-12">
              <div>
                <h3 className="display text-3xl text-ink sm:text-4xl">
                  {selectedYear}–{selectedYear + 1} Calendar
                </h3>
                <p className="mt-3 text-muted">
                  The full year&rsquo;s sports schedule — every tournament and
                  league, month by month.
                </p>
              </div>
              <span className="display text-5xl text-subtle transition-transform duration-500 group-hover:translate-x-2">
                →
              </span>
            </div>
          </Link>
        </div>

        {/* Sports alumni */}
        {alumni.length > 0 && (
          <div>
            <div className="mb-10 border-b border-line/10 pb-10">
              <span className="kicker">Then & now</span>
              <h2 className="display mt-4 text-4xl sm:text-5xl">
                Sports Alumni
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {alumni.map((p) => (
                <div
                  key={p.id}
                  className="group rounded-2xl border border-line/10 bg-surface/40 p-6 transition-all duration-500 hover:border-line/30"
                >
                  {p.photo && (
                    <div className="relative mb-4 aspect-square overflow-hidden rounded-xl border border-line/10 bg-surface-2 flex items-center justify-center">
                      <Image
                        src={p.photo}
                        alt=""
                        fill
                        aria-hidden
                        className="scale-125 object-cover opacity-20 blur-xl pointer-events-none"
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      />
                      <Image
                        src={p.photo}
                        alt={p.name}
                        fill
                        className="object-contain p-2 transition-transform duration-700 group-hover:scale-[1.04]"
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      />
                    </div>
                  )}
                  <h3 className="display text-xl text-ink">{p.name}</h3>
                  {p.sport && (
                    <span className="kicker mt-2 text-accent">
                      {SPORT_LABELS[p.sport] ?? p.sport}
                    </span>
                  )}
                  {p.graduationYear && (
                    <span className="mt-1 block font-mono text-xs text-subtle">
                      Class of {p.graduationYear}
                    </span>
                  )}
                  {p.bio && (
                    <p className="mt-3 text-sm text-muted line-clamp-3">
                      {p.bio}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sports representatives */}
        {reps.length > 0 && (
          <div>
            <div className="mb-10 border-b border-line/10 pb-10">
              <span className="kicker">Who runs things</span>
              <h2 className="display mt-4 text-4xl sm:text-5xl">
                Sports Representatives
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {reps.map((p) => (
                <div
                  key={p.id}
                  className="group rounded-2xl border border-line/10 bg-surface/40 p-6 transition-all duration-500 hover:border-line/30"
                >
                  {p.photo && (
                    <div className="relative mb-4 aspect-square overflow-hidden rounded-xl border border-line/10 bg-surface-2 flex items-center justify-center">
                      <Image
                        src={p.photo}
                        alt=""
                        fill
                        aria-hidden
                        className="scale-125 object-cover opacity-20 blur-xl pointer-events-none"
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      />
                      <Image
                        src={p.photo}
                        alt={p.name}
                        fill
                        className="object-contain p-2 transition-transform duration-700 group-hover:scale-[1.04]"
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      />
                    </div>
                  )}
                  <h3 className="display text-xl text-ink">{p.name}</h3>
                  {p.sport && (
                    <span className="kicker mt-2 text-accent">
                      {SPORT_LABELS[p.sport] ?? p.sport}
                    </span>
                  )}
                  {p.bio && (
                    <p className="mt-3 text-sm text-muted line-clamp-3">
                      {p.bio}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function sortMatches(matches: SportsMatch[]): SportsMatch[] {
  return [...matches].sort((a, b) => {
    if (!a.matchDate && !b.matchDate) return a.id - b.id;
    if (!a.matchDate) return 1;
    if (!b.matchDate) return -1;
    return a.matchDate.localeCompare(b.matchDate);
  });
}

function MatchGroup({
  title,
  matches,
  live = false,
}: {
  title: string;
  matches: SportsMatch[];
  live?: boolean;
}) {
  if (matches.length === 0) return null;

  return (
    <section
      aria-labelledby={`match-group-${title.toLowerCase().replaceAll(" ", "-")}`}
    >
      <div className="mb-4 flex items-center gap-3">
        {live ? (
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-accent motion-safe:animate-pulse"
          />
        ) : null}
        <h3
          id={`match-group-${title.toLowerCase().replaceAll(" ", "-")}`}
          className={`font-mono text-xs uppercase tracking-[0.16em] ${
            live ? "text-accent" : "text-subtle"
          }`}
        >
          {title} · {matches.length}
        </h3>
      </div>
      <div className="grid gap-5 2xl:grid-cols-2">
        {matches.map((match) => (
          <SportsMatchCard key={match.id} match={match} />
        ))}
      </div>
    </section>
  );
}
