import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db/client";
import { events as eventsT } from "@/db/schema";
import { requireOps, canPublish, isAdmin } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { EventsTable } from "./events-table";

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

  const tableRows = rows.map((e) => ({
    id: e.id,
    title: e.title,
    featured: e.featured,
    category: e.category,
    date: e.date,
    status: e.status,
    clubName: e.club?.name ?? "",
  }));

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

      <EventsTable rows={tableRows} publisher={publisher} admin={admin} />
    </div>
  );
}
