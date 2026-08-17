import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  sportsTournaments as tourT,
  sportsLeagues as leagueT,
  sportsMatches as matchT,
  sportsTeams as teamT,
  sportsPeople as peopleT,
} from "@/db/schema";
import { requireOps } from "@/lib/rbac";

export default async function SportsDashboard() {
  await requireOps();
  const [
    tournaments,
    leagues,
    matches,
    teams,
    people,
    liveMatches,
  ] = await Promise.all([
    db.query.sportsTournaments.findMany({ orderBy: desc(tourT.id) }),
    db.query.sportsLeagues.findMany({ orderBy: desc(leagueT.id) }),
    db.query.sportsMatches.findMany({ orderBy: desc(matchT.id) }),
    db.query.sportsTeams.findMany({ orderBy: desc(teamT.id) }),
    db.query.sportsPeople.findMany({ orderBy: desc(peopleT.id) }),
    db.query.sportsMatches.findMany({ where: eq(matchT.status, "live") }),
  ]);

  const stats = [
    { label: "Tournaments", count: tournaments.length, href: "/management/sports/tournaments" },
    { label: "Leagues", count: leagues.length, href: "/management/sports/leagues" },
    { label: "Matches", count: matches.length, href: "/management/sports/matches" },
    { label: "Teams", count: teams.length, href: "/management/sports/teams" },
    { label: "People", count: people.length, href: "/management/sports/people" },
  ];

  return (
    <div>
      <div className="mb-6">
        <p className="kicker text-subtle">Sports</p>
        <h1 className="display mt-1 text-3xl">Dashboard</h1>
      </div>

      {liveMatches.length > 0 && (
        <div className="mb-6 rounded-2xl border border-accent/40 bg-accent/5 p-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="kicker text-accent">
              {liveMatches.length} live match{liveMatches.length > 1 ? "es" : ""}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {liveMatches.map((m) => (
              <a
                key={m.id}
                href={`/management/sports/matches/${m.id}`}
                className="rounded-full border border-accent/30 px-3 py-1.5 text-xs text-ink hover:bg-accent/10"
              >
                Match #{m.id} · {m.scoreA ?? 0} : {m.scoreB ?? 0}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <a
            key={s.label}
            href={s.href}
            className="group rounded-2xl border border-line/15 bg-surface-2 p-5 transition-colors hover:border-line/40"
          >
            <span className="kicker text-subtle">{s.label}</span>
            <div className="mt-2 display text-4xl tabular-nums text-ink">{s.count}</div>
            <span className="mt-1 block text-xs text-subtle group-hover:text-muted">
              View all →
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
