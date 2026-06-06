import "server-only";
import { revalidatePath } from "next/cache";
import { and, eq, lt } from "drizzle-orm";

import { db } from "@/db/client";
import {
  announcements as announcementsT,
  events as eventsT,
  homepageConfig as homepageT,
  recaps as recapsT,
} from "@/db/schema";
import { uniqueSlug } from "@/lib/slug";

/**
 * Backend automation that fans out when an event is published. Each step is
 * best-effort and individually isolated: a failure in one step is logged and
 * never blocks the others (or the original save). Idempotent — re-publishing
 * the same event does not create duplicate announcements / recap stubs.
 *
 * Steps:
 *  1. Announcement   — "New event: {title}" into the ticker (dedupe by event).
 *  2. Recap stub     — a linked draft recap so post-event writeups are 1 click.
 *  3. Homepage       — flagship events become the featured hero; past events
 *                      get de-featured.
 *  4. Revalidate     — bust the cache for /, /events, /events/{slug}, /archive.
 *  5. Notify         — optional Discord webhook (env-gated).
 */
export async function onEventPublished(eventId: number): Promise<{
  steps: Record<string, "ok" | "skipped" | string>;
}> {
  const steps: Record<string, "ok" | "skipped" | string> = {};
  const ev = await db.query.events.findFirst({
    where: eq(eventsT.id, eventId),
  });
  if (!ev || ev.status !== "published") {
    return { steps: { precondition: "skipped (not a published event)" } };
  }

  const nowIso = new Date().toISOString();

  // 1. Announcement (dedupe by eventId)
  await step(steps, "announcement", async () => {
    const existing = await db
      .select({ id: announcementsT.id })
      .from(announcementsT)
      .where(eq(announcementsT.eventId, eventId))
      .limit(1);
    if (existing.length > 0) return "skipped";
    await db.insert(announcementsT).values({
      title: `New event: ${ev.title}`,
      href: `/events/${ev.slug}`,
      date: nowIso,
      pinned: false,
      eventId,
    });
    return "ok";
  });

  // 2. Draft recap stub (dedupe by eventId)
  await step(steps, "recapStub", async () => {
    const existing = await db
      .select({ id: recapsT.id })
      .from(recapsT)
      .where(eq(recapsT.eventId, eventId))
      .limit(1);
    if (existing.length > 0) return "skipped";
    const slug = await uniqueSlug("recaps", `${ev.slug}-recap`);
    await db.insert(recapsT).values({
      title: `${ev.title} — Recap`,
      slug,
      eventId,
      kicker: ev.category.toUpperCase(),
      status: "draft",
      gallery: [],
      stats: [],
    });
    return "ok";
  });

  // 3. Homepage: flagship → featured hero; de-feature past events.
  await step(steps, "homepageFlagship", async () => {
    if (ev.category !== "flagship") return "skipped";
    await db
      .update(homepageT)
      .set({ flagshipEventId: eventId })
      .where(eq(homepageT.id, 1));
    return "ok";
  });

  await step(steps, "defeaturePast", async () => {
    await db
      .update(eventsT)
      .set({ featured: false })
      .where(and(eq(eventsT.featured, true), lt(eventsT.date, nowIso)));
    return "ok";
  });

  // 4. Revalidate public surfaces.
  await step(steps, "revalidate", async () => {
    for (const p of ["/", "/events", `/events/${ev.slug}`, "/archive"]) {
      revalidatePath(p);
    }
    return "ok";
  });

  // 5. Optional Discord notification.
  await step(steps, "notify", async () => {
    const url = process.env.DISCORD_WEBHOOK_URL;
    if (!url) return "skipped";
    const site = process.env.NEXT_PUBLIC_SITE_URL || "";
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: `New event published: ${ev.title}\n${site}/events/${ev.slug}`,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`discord ${res.status}`);
    return "ok";
  });

  return { steps };
}

/** Run one automation step, capturing failures without throwing. */
async function step(
  log: Record<string, string>,
  name: string,
  fn: () => Promise<"ok" | "skipped">,
) {
  try {
    log[name] = await fn();
  } catch (err) {
    log[name] = `error: ${(err as Error).message}`;
    console.error(`[automation] ${name} failed:`, err);
  }
}
