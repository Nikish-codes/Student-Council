import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { sportsMatches as t } from "@/db/schema";
import { requireSportsManager } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { MatchesTable } from "./matches-table";

export default async function MatchesPage() {
  await requireSportsManager();
  const rows = await db.query.sportsMatches.findMany({
    with: { teamA: true, teamB: true },
    orderBy: [desc(t.id)],
  });
  const tableRows = rows.map((r) => ({
    id: r.id,
    teamAName: r.teamA?.name ?? "TBD",
    teamBName: r.teamB?.name ?? "TBD",
    sport: r.sport,
    status: r.status,
    matchDate: r.matchDate,
    scoreA: r.scoreA,
    scoreB: r.scoreB,
  }));

  return (
    <div>
      <PageHeader
        kicker="Sports · Matches"
        title={`${rows.length} matches`}
        newHref="/management/sports/matches/new"
        newLabel="New match"
      />
      <MatchesTable rows={tableRows} />
    </div>
  );
}
