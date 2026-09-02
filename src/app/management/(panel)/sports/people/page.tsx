import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { sportsPeople as t } from "@/db/schema";
import { requireSportsManager } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { PeopleTable } from "./people-table";

export default async function PeoplePage() {
  await requireSportsManager();
  const rows = await db.query.sportsPeople.findMany({
    with: { photo: true },
    orderBy: [asc(t.sortOrder), asc(t.name)],
  });
  const tableRows = rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    sport: r.sport,
    graduationYear: r.graduationYear,
  }));

  return (
    <div>
      <PageHeader
        kicker="Sports · People"
        title={`${rows.length} people`}
        newHref="/management/sports/people/new"
        newLabel="New person"
      />
      <PeopleTable rows={tableRows} />
    </div>
  );
}
