import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { clubs as clubsT, sportsTeams as t } from "@/db/schema";
import { requireSportsManager } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { TeamsTable } from "./teams-table";

export default async function TeamsPage() {
  await requireSportsManager();
  const [rows, clubs] = await Promise.all([
    db.query.sportsTeams.findMany({
      with: { club: true },
      orderBy: asc(t.name),
    }),
    db.select({ id: clubsT.id, name: clubsT.name }).from(clubsT),
  ]);
  const clubName = new Map(clubs.map((c) => [c.id, c.name]));
  const tableRows = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    clubName: r.clubId != null ? (clubName.get(r.clubId) ?? null) : null,
  }));

  return (
    <div>
      <PageHeader
        kicker="Sports · Teams"
        title={`${rows.length} teams`}
        newHref="/management/sports/teams/new"
        newLabel="New team"
      />
      <TeamsTable rows={tableRows} />
    </div>
  );
}
