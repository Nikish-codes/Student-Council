import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { supportChannels as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteSupport } from "./actions";

export default async function SupportPage() {
  const user = await requireOps();
  const rows = await db.select().from(t).orderBy(asc(t.name));
  const admin = isAdmin(user.role);
  return (
    <div>
      <PageHeader kicker="Support channels" title={`${rows.length} total`} newHref="/management/support/new" newLabel="New channel" />
      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line/10 last:border-0 hover:bg-line/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/management/support/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                  <span className="ml-2 text-xs text-subtle">{c.purpose}</span>
                </td>
                <td className="px-4 py-3 text-muted">{c.ownedBy}</td>
                <td className="px-4 py-3 text-right">
                  {admin ? <DeleteButton action={deleteSupport.bind(null, c.id)} /> : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-4 py-12 text-center text-subtle">None yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
