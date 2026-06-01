import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { faqs as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteFaq } from "./actions";

export default async function FaqsPage() {
  const user = await requireOps();
  const rows = await db.select().from(t).orderBy(asc(t.sortOrder));
  const admin = isAdmin(user.role);
  return (
    <div>
      <PageHeader kicker="FAQs" title={`${rows.length} total`} newHref="/management/faqs/new" newLabel="New FAQ" />
      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="border-b border-line/10 last:border-0 hover:bg-line/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/management/faqs/${f.id}`} className="font-medium hover:underline">
                    {f.question}
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize text-muted">{f.page}</td>
                <td className="px-4 py-3 text-right">
                  {admin ? <DeleteButton action={deleteFaq.bind(null, f.id)} /> : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td className="px-4 py-12 text-center text-subtle">No FAQs yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
