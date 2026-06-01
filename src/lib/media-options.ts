import "server-only";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { media } from "@/db/schema";

/** Media options for pickers — newest first. */
export async function mediaOptions() {
  return db
    .select({ id: media.id, url: media.url, filename: media.filename })
    .from(media)
    .orderBy(desc(media.id));
}
