import Link from "next/link";
import Image from "next/image";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { highlights as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteHighlight } from "./actions";

export default async function HighlightsPage() {
  const user = await requireOps();
  const rows = await db.query.highlights.findMany({
    with: { image: true },
    orderBy: asc(t.sortOrder),
  });
  const admin = isAdmin(user.role);
  return (
    <div>
      <PageHeader kicker="Homepage highlights" title={`${rows.length} total`} newHref="/management/highlights/new" newLabel="New highlight" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {rows.map((h) => (
          <div key={h.id} className="surface-card overflow-hidden rounded-2xl">
            <Link href={`/management/highlights/${h.id}`} className="relative block aspect-square bg-line/5">
              {h.image?.url ? <Image src={h.image.url} alt={h.alt} fill className="object-cover" sizes="200px" /> : null}
            </Link>
            <div className="flex items-center justify-between p-3">
              <span className="text-xs text-muted">{h.span} · #{h.sortOrder}</span>
              {admin ? <DeleteButton action={deleteHighlight.bind(null, h.id)} label="" /> : null}
            </div>
          </div>
        ))}
        {rows.length === 0 ? <p className="col-span-full py-12 text-center text-subtle">No highlights yet.</p> : null}
      </div>
    </div>
  );
}
