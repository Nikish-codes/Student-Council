import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Rows3 } from "lucide-react";
import { db } from "@/db/client";
import { clubCategories as cat, clubs as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { ClubsTable } from "./clubs-table";

export default async function ClubsPage() {
  const user = await requireOps();
  const isLead = user.role === "club_lead";
  const [rows, cats] = await Promise.all([
    db
      .select()
      .from(t)
      .where(isLead ? eq(t.id, user.clubId ?? -1) : undefined)
      .orderBy(asc(t.name)),
    db.select({ id: cat.id, label: cat.label }).from(cat),
  ]);
  const catLabel = new Map(cats.map((c) => [c.id, c.label]));
  const admin = isAdmin(user.role);

  const tableRows = rows.map((c) => ({
    id: c.id,
    name: c.name,
    categoryName: c.categoryId != null ? catLabel.get(c.categoryId) ?? "" : "",
    tags: c.tags,
    members: c.members,
  }));

  return (
    <div>
      <PageHeader
        kicker="Clubs"
        title={isLead ? "Your club" : `${rows.length} total`}
        newHref={isLead ? undefined : "/management/clubs/new"}
        newLabel="New club"
      />

      {isLead ? null : (
        <div className="mb-6">
          <Link
            href="/management/clubs/categories"
            className="inline-flex items-center gap-2 rounded-full border border-line/15 px-3 py-1.5 text-xs text-muted transition-colors hover:border-line/40 hover:text-ink"
          >
            <Rows3 className="h-3.5 w-3.5" />
            Manage categories
          </Link>
        </div>
      )}

      <ClubsTable rows={tableRows} admin={admin} />
    </div>
  );
}
