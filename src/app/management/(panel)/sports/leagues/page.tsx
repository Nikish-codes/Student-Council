import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { sportsLeagues as t } from "@/db/schema";
import { requireSportsManager } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { LeaguesTable } from "./leagues-table";

export default async function LeaguesPage() {
  await requireSportsManager();
  const rows = await db.query.sportsLeagues.findMany({
    orderBy: [desc(t.year), desc(t.id)],
  });
  const tableRows = rows.map((r) => ({
    id: r.id,
    title: r.title,
    sport: r.sport,
    division: r.division,
    year: r.year,
    status: r.status,
  }));

  return (
    <div>
      <PageHeader
        kicker="Sports · Leagues"
        title={`${rows.length} leagues`}
        newHref="/management/sports/leagues/new"
        newLabel="New league"
      />
      <LeaguesTable rows={tableRows} />
    </div>
  );
}
