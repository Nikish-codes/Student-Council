import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { clubs as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteClub } from "./actions";

export default async function ClubsPage() {
  const user = await requireOps();
  const rows = await db.select().from(t).orderBy(asc(t.name));
  const admin = isAdmin(user.role);
  return (
    <div>
      <PageHeader kicker="Clubs" title={`${rows.length} total`} newHref="/management/clubs/new" newLabel="New club" />
      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line/10 last:border-0 hover:bg-line/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/management/clubs/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                </td>
                <td className="px-4 py-3 text-muted">{(c.tags ?? []).join(", ")}</td>
                <td className="px-4 py-3 text-muted">{c.members ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {admin ? <DeleteButton action={deleteClub.bind(null, c.id)} /> : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-4 py-12 text-center text-subtle">No clubs yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
