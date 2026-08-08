import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { recaps as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { RecapsTable } from "./recaps-table";

export default async function RecapsPage() {
  const user = await requireOps();
  const rows = await db.query.recaps.findMany({
    orderBy: desc(t.publishedAt),
    with: { event: { columns: { title: true } } },
  });
  const admin = isAdmin(user.role);

  const tableRows = rows.map((r) => ({
    id: r.id,
    title: r.title,
    eventTitle: r.event?.title ?? "",
    status: r.status,
  }));

  return (
    <div>
      <PageHeader
        kicker="Recaps"
        title={`${rows.length} total`}
        newHref="/management/recaps/new"
        newLabel="New recap"
      />
      <RecapsTable rows={tableRows} admin={admin} />
    </div>
  );
}
