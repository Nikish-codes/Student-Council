import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { clubs as clubsT, events as eventsT, recaps as recapsT } from "@/db/schema";
import { slugify } from "@/lib/slugify";

export { slugify };

type SlugTable = "events" | "recaps" | "clubs";

const SLUG_TABLES = {
  events: { t: eventsT, slug: eventsT.slug, id: eventsT.id },
  recaps: { t: recapsT, slug: recapsT.slug, id: recapsT.id },
  clubs: { t: clubsT, slug: clubsT.slug, id: clubsT.id },
} as const;

/**
 * Return a slug unique within the given table, appending -2, -3, … on
 * collision. `excludeId` lets an existing row keep its own slug on update.
 */
export async function uniqueSlug(
  table: SlugTable,
  base: string,
  excludeId?: number,
): Promise<string> {
  const root = slugify(base) || "item";
  const { t, slug: col, id: idCol } = SLUG_TABLES[table];

  let candidate = root;
  for (let n = 2; n < 1000; n++) {
    const where = excludeId
      ? and(eq(col, candidate), ne(idCol, excludeId))
      : eq(col, candidate);
    const hit = await db.select({ id: idCol }).from(t).where(where).limit(1);
    if (hit.length === 0) return candidate;
    candidate = `${root}-${n}`;
  }
  return `${root}-${Date.now()}`;
}
