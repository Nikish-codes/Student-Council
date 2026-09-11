import "server-only";
import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { clubs as clubsT } from "@/db/schema";

/**
 * Flush the cached `/clubs/<slug>` pages for the given club ids.
 *
 * A club page aggregates content owned by three different resources — the club
 * row itself, its events (`events.club_id`) and its leads
 * (`council_members.club_id`) — so a write to any of those can leave it stale.
 * The page carries `revalidate = 300` as a backstop, but an author who just
 * saved something expects to see it immediately, not in five minutes.
 *
 * Takes ids rather than slugs because every caller has the id; the slug lookup
 * happens here. Pass BOTH the old and new id when something is reassigned, so
 * the club it moved away from is flushed as well.
 */
export async function revalidateClubPages(
  ...clubIds: (number | null | undefined)[]
) {
  revalidatePath("/clubsignup");
  const ids = [...new Set(clubIds.filter((x): x is number => Boolean(x)))];
  if (ids.length === 0) return;
  const rows = await db
    .select({ slug: clubsT.slug })
    .from(clubsT)
    .where(inArray(clubsT.id, ids));
  for (const r of rows) revalidatePath(`/clubs/${r.slug}`);
}
