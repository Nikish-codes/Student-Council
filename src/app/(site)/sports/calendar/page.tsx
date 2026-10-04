import type { Metadata } from "next";
import Link from "next/link";
import { SportsCalendarViewer } from "@/components/sections/sports-calendar-viewer";
import { SportsMatchCard } from "@/components/sections/sports-match-card";
import {
  getSportsMatches,
  getSportsPageConfig,
  type SportsMatch,
} from "@/lib/content";
import {
  formatSportsMatchMonth,
  getSportsMatchMonthKey,
  getSportsMatchYear,
} from "@/lib/sports-match";

export const metadata: Metadata = {
  title: "Sports Calendar",
  description:
    "The Woxsen Sports Academy fixture calendar — matches and results, month by month.",
};

export const revalidate = 60;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const [{ year: requestedYear }, matches, config] = await Promise.all([
    searchParams,
    getSportsMatches(),
    getSportsPageConfig(),
  ]);
  const currentYear = new Date().getFullYear();
  const years = new Set<number>();
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
  const yearMatches = matches.filter(
    (match) =>
      (match.competitionYear ??
        getSportsMatchYear(match.matchDate) ??
        currentYear) === selectedYear,
  );
  const datedMatches = [...yearMatches]
    .filter((match) => match.matchDate)
    .sort((a, b) => (a.matchDate ?? "").localeCompare(b.matchDate ?? ""));
  const undatedMatches = yearMatches.filter((match) => !match.matchDate);
  const monthGroups = new Map<string, SportsMatch[]>();
  for (const match of datedMatches) {
    const key = getSportsMatchMonthKey(match.matchDate);
    if (!key) continue;
    const group = monthGroups.get(key) ?? [];
    group.push(match);
    monthGroups.set(key, group);
  }

  return (
    <div className="container pb-32 pt-32 sm:pt-40">
      <div className="mb-12 border-b border-line/10 pb-10">
        <span className="kicker">Sports</span>
        <h1 className="display mt-4 text-5xl sm:text-7xl">Calendar</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Every published fixture and result, organised month by month.
        </p>
      </div>

      {sortedYears.length > 1 ? (
        <nav
          aria-label="Calendar year"
          className="mb-12 flex flex-wrap items-center gap-2"
        >
          {sortedYears.map((year) => (
            <Link
              key={year}
              href={
                year === defaultYear
                  ? "/sports/calendar"
                  : `/sports/calendar?year=${year}`
              }
              aria-current={year === selectedYear ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-4 font-mono text-sm uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                year === selectedYear
                  ? "bg-ink text-bg"
                  : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {year}
            </Link>
          ))}
        </nav>
      ) : null}

      {config.calendarImage ? (
        <SportsCalendarViewer
          imageUrl={config.calendarImage}
          title={config.calendarTitle}
          description={config.calendarDescription}
        />
      ) : null}

      {yearMatches.length > 0 ? (
        <div className="space-y-16">
          {config.calendarImage ? (
            <div className="border-b border-line/10 pb-4">
              <span className="kicker">Fixtures & results</span>
              <h2 className="display mt-1 text-2xl sm:text-3xl">
                Month-by-month matches
              </h2>
            </div>
          ) : null}
          {Array.from(monthGroups.entries()).map(([key, monthMatches]) => (
            <section key={key} aria-labelledby={`month-${key}`}>
              <div className="mb-6 flex items-baseline gap-4 border-b border-line/10 pb-5">
                <h2
                  id={`month-${key}`}
                  className="display text-3xl text-ink sm:text-4xl"
                >
                  {formatSportsMatchMonth(monthMatches[0]?.matchDate)}
                </h2>
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-subtle">
                  {monthMatches.length} match
                  {monthMatches.length === 1 ? "" : "es"}
                </span>
              </div>
              <div className="grid gap-5 2xl:grid-cols-2">
                {monthMatches.map((match) => (
                  <SportsMatchCard key={match.id} match={match} />
                ))}
              </div>
            </section>
          ))}

          {undatedMatches.length > 0 ? (
            <section aria-labelledby="date-tba">
              <div className="mb-6 flex items-baseline gap-4 border-b border-line/10 pb-5">
                <h2
                  id="date-tba"
                  className="display text-3xl text-ink sm:text-4xl"
                >
                  Date to be announced
                </h2>
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-subtle">
                  {undatedMatches.length} match
                  {undatedMatches.length === 1 ? "" : "es"}
                </span>
              </div>
              <div className="grid gap-5 2xl:grid-cols-2">
                {undatedMatches.map((match) => (
                  <SportsMatchCard key={match.id} match={match} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-line/10 bg-surface/40 px-6 py-16 text-center">
          <p className="display text-2xl text-muted">
            {config.calendarImage
              ? `Individual match cards for ${selectedYear} will appear as fixtures commence.`
              : `No matches scheduled for ${selectedYear}.`}
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm text-subtle">
            {config.calendarImage
              ? "Please check the official calendar schedule above for tournament windows and sport dates."
              : "New fixtures will appear here automatically after they are added in management."}
          </p>
        </div>
      )}
    </div>
  );
}
