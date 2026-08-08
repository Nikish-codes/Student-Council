import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { faqs as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { FaqsTable } from "./faqs-table";

export default async function FaqsPage() {
  const user = await requireOps();
  const rows = await db.select().from(t).orderBy(asc(t.sortOrder));
  const admin = isAdmin(user.role);

  const tableRows = rows.map((f) => ({
    id: f.id,
    question: f.question,
    page: f.page,
  }));

  return (
    <div>
      <PageHeader
        kicker="FAQs"
        title={`${rows.length} total`}
        newHref="/management/faqs/new"
        newLabel="New FAQ"
      />
      <FaqsTable rows={tableRows} admin={admin} />
    </div>
  );
}
