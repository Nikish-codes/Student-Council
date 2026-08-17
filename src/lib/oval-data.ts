import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { ovalMenuDays, type DbOvalMenuDay } from "@/db/schema";

export function isOvalSchemaMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /no such table.*mp_oval_menu_days/i.test(message);
}

/** Public read: exactly one approved service date, never an adjacent day. */
export async function getApprovedOvalDay(
  menuDate: string,
): Promise<DbOvalMenuDay | null> {
  try {
    return (
      (await db.query.ovalMenuDays.findFirst({
        where: and(
          eq(ovalMenuDays.menuDate, menuDate),
          eq(ovalMenuDays.status, "approved"),
        ),
      })) ?? null
    );
  } catch (error) {
    // A deployment may briefly run new code before its migration. Public users
    // get the honest unavailable state instead of a 500 page during that window.
    if (isOvalSchemaMissing(error)) return null;
    throw error;
  }
}
export async function getOvalWeekRows(
  weekStart: string,
): Promise<DbOvalMenuDay[]> {
  try {
    return await db
      .select()
      .from(ovalMenuDays)
      .where(eq(ovalMenuDays.weekStart, weekStart))
      .orderBy(asc(ovalMenuDays.menuDate));
  } catch (error) {
    if (isOvalSchemaMissing(error)) return [];
    throw error;
  }
}
