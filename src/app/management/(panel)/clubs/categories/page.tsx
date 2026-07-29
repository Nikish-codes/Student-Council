import Link from "next/link";
import { asc } from "drizzle-orm";
import { ChevronDown, ChevronUp } from "lucide-react";
import { db } from "@/db/client";
import { clubCategories as t, clubs as c } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteClubCategory, moveClubCategory } from "./actions";

export default async function ClubCategoriesPage() {
  const user = await requireOps();
  const admin = isAdmin(user.role);

  const [cats, clubRows] = await Promise.all([
    db.select().from(t).orderBy(asc(t.sortOrder), asc(t.id)),
    db.select({ id: c.id, categoryId: c.categoryId }).from(c),
  ]);

  const counts = new Map<number, number>();
  for (const row of clubRows) {
    if (row.categoryId == null) continue;
    counts.set(row.categoryId, (counts.get(row.categoryId) ?? 0) + 1);
  }
  const unfiled = clubRows.filter(
    (r) => r.categoryId == null || !counts.has(r.categoryId),
  ).length;

  return (
    <div>
      <PageHeader
        kicker="Club categories"
        title={`${cats.length} on the page`}
        newHref="/management/clubs/categories/new"
        newLabel="New category"
      />

      <p className="mb-6 max-w-2xl text-sm text-muted">
        Categories are the headings on <span className="text-ink">/clubs</span>,
        top to bottom. Open one to rename it or tick which clubs belong to it —
        or set a club&rsquo;s category from its own editor. Deleting a category
        never deletes clubs; they fall back to a &ldquo;More Clubs&rdquo; block
        until refiled.
      </p>

      {unfiled > 0 ? (
        <p className="mb-6 text-sm text-amber-300/80">
          {unfiled} club{unfiled === 1 ? "" : "s"} not filed under any category.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line/10 text-left text-[11px] uppercase tracking-wider text-subtle">
              <th className="px-4 py-2 font-normal">Category</th>
              <th className="px-4 py-2 font-normal">Anchor</th>
              <th className="px-4 py-2 font-normal">Clubs</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {cats.map((g) => (
              <tr
                key={g.id}
                className="border-b border-line/10 last:border-0 hover:bg-line/[0.02]"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/management/clubs/categories/${g.id}`}
                    className="font-medium hover:underline"
                  >
                    {g.label}
                  </Link>
                  {g.blurb ? (
                    <p className="mt-1 max-w-md truncate text-xs text-subtle">
                      {g.blurb}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted">
                  #cat-{g.slug}
                </td>
                <td className="px-4 py-3 font-mono text-muted">
                  {counts.get(g.id) ?? 0}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <MoveButton id={g.id} dir="up" />
                    <MoveButton id={g.id} dir="down" />
                    {admin ? (
                      <DeleteButton
                        action={deleteClubCategory.bind(null, g.id)}
                        confirmText={`Delete "${g.label}"? Its clubs stay on the site but become uncategorised.`}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {cats.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-subtle">
                  No categories yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MoveButton({ id, dir }: { id: number; dir: "up" | "down" }) {
  const Icon = dir === "up" ? ChevronUp : ChevronDown;
  return (
    <form action={moveClubCategory.bind(null, id, dir)}>
      <button
        type="submit"
        aria-label={`Move ${dir}`}
        className="grid h-7 w-7 place-items-center rounded-full text-subtle transition-colors hover:bg-line/5 hover:text-ink"
      >
        <Icon className="h-4 w-4" />
      </button>
    </form>
  );
}
