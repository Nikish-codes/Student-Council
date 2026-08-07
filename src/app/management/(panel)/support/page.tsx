import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { supportChannels as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { SupportTable } from "./support-table";

export default async function SupportPage() {
  const user = await requireOps();
  const rows = await db.select().from(t).orderBy(asc(t.name));
  const admin = isAdmin(user.role);

  const tableRows = rows.map((c) => ({
    id: c.id,
    name: c.name,
    purpose: c.purpose,
    ownedBy: c.ownedBy,
  }));

  return (
    <div>
      <PageHeader
        kicker="Support channels"
        title={`${rows.length} total`}
        newHref="/management/support/new"
        newLabel="New channel"
      />
      <SupportTable rows={tableRows} admin={admin} />
    </div>
  );
}
