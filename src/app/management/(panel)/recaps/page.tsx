import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { recaps as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteRecap } from "./actions";

export default async function RecapsPage() {
  const user = await requireOps();
  const rows = await db.query.recaps.findMany({
    orderBy: desc(t.publishedAt),
    with: { event: { columns: { title: true } } },
  });
  const admin = isAdmin(user.role);
  return (
    <div>
      <PageHeader kicker="Recaps" title={`${rows.length} total`} newHref="/management/recaps/new" newLabel="New recap" />
      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/10 last:border-0 hover:bg-line/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/management/recaps/${r.id}`} className="font-medium hover:underline">{r.title}</Link>
                  {r.event ? <span className="ml-2 text-xs text-subtle">· {r.event.title}</span> : null}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${r.status === "published" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-line/15 text-subtle"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {admin ? <DeleteButton action={deleteRecap.bind(null, r.id)} /> : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-4 py-12 text-center text-subtle">No recaps yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
