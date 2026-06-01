import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { councilMembers as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteCouncil } from "./actions";

export default async function CouncilPage() {
  const user = await requireOps();
  const rows = await db.select().from(t).orderBy(asc(t.sortOrder));
  const admin = isAdmin(user.role);
  return (
    <div>
      <PageHeader kicker="Council members" title={`${rows.length} total`} newHref="/management/council/new" newLabel="New member" />
      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-line/10 last:border-0 hover:bg-line/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/management/council/${m.id}`} className="font-medium hover:underline">{m.name}</Link>
                  {m.isPresident ? <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">president</span> : null}
                </td>
                <td className="px-4 py-3 text-muted">{m.role}</td>
                <td className="px-4 py-3 text-right">
                  {admin ? <DeleteButton action={deleteCouncil.bind(null, m.id)} /> : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-4 py-12 text-center text-subtle">No members yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
