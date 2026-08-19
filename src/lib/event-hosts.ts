import { and, eq, inArray, or } from "drizzle-orm";

import { db } from "@/db/client";
import { eventClubs, events } from "@/db/schema";

function uniquePositiveIntegers(values: unknown[]): number[] {
  return [
    ...new Set(
      values
        .map(Number)
        .filter(Number.isInteger)
        .filter((id) => id > 0),
    ),
  ];
}

/** Parse all repeated `clubIds` fields without trusting client-side controls. */
export function hostingClubIdsFromForm(
  formData: FormData,
  requiredClubId?: number,
): number[] {
  const selected = uniquePositiveIntegers(formData.getAll("clubIds"));
  if (requiredClubId && !selected.includes(requiredClubId)) {
    selected.unshift(requiredClubId);
  }
  return selected;
}

/** Keep the compatibility `club_id` pointed at a selected host. */
export function primaryHostingClubId(
  selectedClubIds: number[],
  preferredClubId?: number | null,
): number | null {
  if (preferredClubId && selectedClubIds.includes(preferredClubId)) {
    return preferredClubId;
  }
  return selectedClubIds[0] ?? null;
}

export async function getEventHostingClubIds(
  eventId: number,
): Promise<number[]> {
  const rows = await db
    .select({ clubId: eventClubs.clubId })
    .from(eventClubs)
    .where(eq(eventClubs.eventId, eventId));
  if (rows.length) return rows.map((row) => row.clubId);

  // Compatibility fallback for databases/records created before the junction.
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: { clubId: true },
  });
  return event?.clubId ? [event.clubId] : [];
}

export async function eventIsHostedByClub(eventId: number, clubId: number) {
  const row = await db
    .select({ id: events.id })
    .from(events)
    .leftJoin(eventClubs, eq(eventClubs.eventId, events.id))
    .where(
      and(
        eq(events.id, eventId),
        or(eq(eventClubs.clubId, clubId), eq(events.clubId, clubId)),
      ),
    )
    .limit(1);
  return row.length > 0;
}

export function eventIdsHostedByClub(clubId: number) {
  return db
    .select({ eventId: eventClubs.eventId })
    .from(eventClubs)
    .where(eq(eventClubs.clubId, clubId));
}

export function hostedByClubWhere(clubId: number) {
  return or(
    eq(events.clubId, clubId),
    inArray(events.id, eventIdsHostedByClub(clubId)),
  );
}

export async function replaceEventHostingClubs(
  tx: Pick<typeof db, "delete" | "insert">,
  eventId: number,
  clubIds: number[],
) {
  await tx.delete(eventClubs).where(eq(eventClubs.eventId, eventId));
  if (clubIds.length) {
    await tx
      .insert(eventClubs)
      .values(
        uniquePositiveIntegers(clubIds).map((clubId) => ({ eventId, clubId })),
      );
  }
}
