import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db/client";
import { events as eventsT } from "@/db/schema";
import { requireOps, canPublish, isAdmin } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { ApprovalButton } from "./approval-button";
import { DeleteEventButton } from "./delete-button";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  pending_review: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  draft: "bg-line/5 text-subtle border-line/15",
  archived: "bg-line/5 text-subtle border-line/15",
};

export default async function EventsListPage() {
  const user = await requireOps();

  const rows = await db.query.events.findMany({
    where:
      user.role === "club_lead" && user.clubId
        ? eq(eventsT.clubId, user.clubId)
        : undefined,
    orderBy: desc(eventsT.date),
    with: { club: { columns: { name: true } } },
  });

  const publisher = canPublish(user.role);
  const admin = isAdmin(user.role);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="kicker text-subtle">Events</p>
          <h1 className="display mt-1 text-3xl">{rows.length} total</h1>
        </div>
        <Button asChild>
          <Link href="/management/events/new">
            <Plus className="h-4 w-4" /> New event
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr
                key={e.id}
                className="border-t border-line/10 transition-colors hover:bg-line/[0.02]"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/management/events/${e.id}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {e.title}
                  </Link>
                  {e.featured ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">
                      ★ featured
                    </span>
                  ) : null}
                  {e.club ? (
                    <span className="ml-2 text-xs text-subtle">
                      · {e.club.name}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 capitalize text-muted">{e.category}</td>
                <td className="px-4 py-3 text-muted">
                  {e.date ? new Date(e.date).toLocaleDateString("en-IN") : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[11px] ${
                      STATUS_STYLES[e.status] ?? STATUS_STYLES.draft
                    }`}
                  >
                    {e.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {publisher && e.status === "pending_review" ? (
                      <ApprovalButton id={e.id} />
                    ) : null}
                    {admin ? (
                      <DeleteEventButton id={e.id} title={e.title} />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-subtle">
                  No events yet.{" "}
                  <Link href="/management/events/new" className="underline">
                    Create one
                  </Link>
                  .
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
