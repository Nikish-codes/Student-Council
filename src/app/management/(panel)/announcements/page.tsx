import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { announcements as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteAnnouncement } from "./actions";

export default async function AnnouncementsPage() {
  const user = await requireOps();
  const rows = await db.select().from(t).orderBy(desc(t.date));
  const admin = isAdmin(user.role);

  return (
    <div>
      <PageHeader
        kicker="Announcements"
        title={`${rows.length} total`}
        newHref="/management/announcements/new"
        newLabel="New announcement"
      />
      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-line/10 last:border-0 hover:bg-line/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/management/announcements/${a.id}`} className="font-medium hover:underline">
                    {a.title}
                  </Link>
                  {a.pinned ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">pinned</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted">
                  {a.date ? new Date(a.date).toLocaleDateString("en-IN") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {admin ? <DeleteButton action={deleteAnnouncement.bind(null, a.id)} /> : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-subtle">No announcements yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
