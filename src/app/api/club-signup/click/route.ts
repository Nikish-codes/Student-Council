import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { clubSignupClicks, clubs } from "@/db/schema";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SLUG = 120;

export async function POST(request: Request) {
  const limit = rateLimit(`clubsignup-click:${clientIp(request)}`, 30, 60_000);
  if (!limit.ok) return new Response(null, { status: 204 });

  let slug = "";
  try {
    const body = await request.json();
    slug = String(body?.slug ?? "").trim();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!slug || slug.length > MAX_SLUG) {
    return new Response(null, { status: 400 });
  }

  // Only count clicks for clubs that actually exist.
  const club = (
    await db
      .select({ id: clubs.id })
      .from(clubs)
      .where(and(eq(clubs.slug, slug)))
      .limit(1)
  )[0];
  if (!club) return new Response(null, { status: 204 });

  try {
    await db
      .insert(clubSignupClicks)
      .values({ slug, total: 1, updatedAt: Date.now() })
      .onConflictDoUpdate({
        target: clubSignupClicks.slug,
        set: {
          total: sql`${clubSignupClicks.total} + 1`,
          updatedAt: Date.now(),
        },
      });
  } catch {
    return new Response(null, { status: 204 });
  }
  return new Response(null, { status: 204 });
}
