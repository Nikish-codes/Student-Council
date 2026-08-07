import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { announcements as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { AnnouncementsTable } from "./announcements-table";

export default async function AnnouncementsPage() {
  const user = await requireOps();
  const rows = await db.select().from(t).orderBy(desc(t.date));
  const admin = isAdmin(user.role);

  const tableRows = rows.map((a) => ({
    id: a.id,
    title: a.title,
    pinned: a.pinned,
    date: a.date,
  }));

  return (
    <div>
      <PageHeader
        kicker="Announcements"
        title={`${rows.length} total`}
        newHref="/management/announcements/new"
        newLabel="New announcement"
      />
      <AnnouncementsTable rows={tableRows} admin={admin} />
    </div>
  );
}
