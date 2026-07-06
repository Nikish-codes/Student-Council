import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

import { db } from "@/db/client";
import { events } from "@/db/schema";
import { requireOps, assertCanEditEvent } from "@/lib/rbac";
import { getCheckedInCount } from "@/lib/event-ops";
import { Scanner } from "./scanner";

export const dynamic = "force-dynamic";

export default async function CheckinStation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isFinite(eventId)) notFound();

  const user = await requireOps();
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!event) notFound();
  assertCanEditEvent(user, event.clubId);

  const { checkedIn, confirmed } = await getCheckedInCount(eventId);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <div>
        <Link
          href={`/eventmanagement/${eventId}`}
          className="inline-flex items-center gap-2 text-xs text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" /> Console
        </Link>
        <h1 className="display mt-2 text-2xl text-ink">{event.title}</h1>
        <p className="text-sm text-muted">Check-in station</p>
      </div>
      <Scanner eventId={eventId} initialCheckedIn={checkedIn} confirmed={confirmed} />
    </div>
  );
}
