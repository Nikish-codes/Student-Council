import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { media as t } from "@/db/schema";
import { requireOps } from "@/lib/rbac";
import { MediaLibrary } from "./media-library";

export default async function MediaPage() {
  await requireOps();
  const items = await db
    .select({ id: t.id, url: t.url, filename: t.filename, mimeType: t.mimeType })
    .from(t)
    .orderBy(desc(t.id));
  return <MediaLibrary initial={items} />;
}
