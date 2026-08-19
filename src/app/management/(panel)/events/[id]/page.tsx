import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  clubs as clubsT,
  events as eventsT,
  media as mediaT,
} from "@/db/schema";
import {
  canPublish,
  requireOps,
  assertCanEditEvent,
  isAdmin,
} from "@/lib/rbac";
import { createEvent, updateEvent } from "../actions";
import { EventEditor } from "../event-editor";
import { getEventHostingClubIds } from "@/lib/event-hosts";

export default async function EventEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireOps();
  const isNew = id === "new";

  const event = isNew
    ? null
    : await db.query.events.findFirst({
        where: eq(eventsT.id, Number(id)),
      });
  if (!isNew && !event) notFound();
  if (event) assertCanEditEvent(user, event.clubId);

  const [clubList, mediaList, hostingClubIds] = await Promise.all([
    db
      .select({ id: clubsT.id, name: clubsT.name })
      .from(clubsT)
      .orderBy(asc(clubsT.name)),
    db
      .select({ id: mediaT.id, filename: mediaT.filename, url: mediaT.url })
      .from(mediaT)
      .orderBy(asc(mediaT.filename)),
    event ? getEventHostingClubIds(event.id) : Promise.resolve([]),
  ]);

  const action = isNew ? createEvent : updateEvent.bind(null, Number(id));

  return (
    <EventEditor
      action={action}
      event={event ?? null}
      clubs={clubList}
      media={mediaList}
      canPublish={canPublish(user.role)}
      isClubLead={user.role === "club_lead"}
      canDelete={!isNew && isAdmin(user.role)}
      hostingClubIds={hostingClubIds}
    />
  );
}
