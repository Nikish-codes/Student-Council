import Link from "next/link";
import { asc } from "drizzle-orm";
import { Rows3 } from "lucide-react";
import { db } from "@/db/client";
import { councilGroups as g, councilMembers as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteCouncil } from "./actions";

export default async function CouncilPage() {
  const user = await requireOps();
  const [rows, groups] = await Promise.all([
    db.select().from(t).orderBy(asc(t.sortOrder)),
    db.select({ id: g.id, title: g.title }).from(g),
  ]);
  const groupTitle = new Map(groups.map((x) => [x.id, x.title]));
  const admin = isAdmin(user.role);

  return (
    <div>
      <PageHeader kicker="Council members" title={`${rows.length} total`} newHref="/management/council/new" newLabel="New member" />

      <div className="mb-6">
        <Link
          href="/management/council/groups"
          className="inline-flex items-center gap-2 rounded-full border border-line/15 px-3 py-1.5 text-xs text-muted transition-colors hover:border-line/40 hover:text-ink"
        >
          <Rows3 className="h-3.5 w-3.5" />
          Manage page sections
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-line/10 last:border-0 hover:bg-line/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/management/council/${m.id}`} className="font-medium hover:underline">{m.name}</Link>
                  {m.memberType === "president" ? <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">president</span> : null}
                </td>
                <td className="px-4 py-3 text-muted">{m.role}</td>
                <td className="px-4 py-3 text-xs">
                  {m.memberType === "president" ? (
                    <span className="text-subtle">—</span>
                  ) : m.groupId != null && groupTitle.has(m.groupId) ? (
                    <span className="text-muted">{groupTitle.get(m.groupId)}</span>
                  ) : (
                    <span className="text-amber-300/70">ungrouped</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {admin ? <DeleteButton action={deleteCouncil.bind(null, m.id)} /> : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-4 py-12 text-center text-subtle" colSpan={4}>No members yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
