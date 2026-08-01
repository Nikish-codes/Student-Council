import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Rows3 } from "lucide-react";
import { db } from "@/db/client";
import { clubCategories as cat, clubs as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteClub } from "./actions";

export default async function ClubsPage() {
  const user = await requireOps();
  // A club lead sees only their own club — the editor and the save action
  // enforce this too (assertCanEditClub); this just keeps the list honest.
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

      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line/10 last:border-0 hover:bg-line/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/management/clubs/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                </td>
                <td className="px-4 py-3 text-xs">
                  {c.categoryId != null && catLabel.has(c.categoryId) ? (
                    <span className="text-muted">{catLabel.get(c.categoryId)}</span>
                  ) : (
                    <span className="text-amber-300/70">uncategorised</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{(c.tags ?? []).join(", ")}</td>
                <td className="px-4 py-3 text-muted">{c.members ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {admin ? <DeleteButton action={deleteClub.bind(null, c.id)} /> : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-subtle">No clubs yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
