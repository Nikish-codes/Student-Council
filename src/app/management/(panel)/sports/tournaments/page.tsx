import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { sportsTournaments as t } from "@/db/schema";
import { requireOps } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { TournamentsTable } from "./tournaments-table";

export default async function TournamentsPage() {
  await requireOps();
  const rows = await db.query.sportsTournaments.findMany({
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
        kicker="Sports · Tournaments"
        title={`${rows.length} tournaments`}
        newHref="/management/sports/tournaments/new"
        newLabel="New tournament"
      />
      <TournamentsTable rows={tableRows} />
    </div>
  );
}
