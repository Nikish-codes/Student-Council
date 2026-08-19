"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { eventFollowupTasks, recaps } from "@/db/schema";
import { requireClubMembership } from "@/lib/club-access";
import { requireStudioClub } from "@/lib/club-studio";
import { saveRevisionDraft, submitRevision } from "@/lib/revisions";

const s = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export async function saveFollowupRevision(formData: FormData) {
  const active = await requireStudioClub(s(formData, "clubId"));
  await requireClubMembership(active.clubId, "manage_media");
  const eventId = Number(s(formData, "eventId"));
  const task = await db.query.eventFollowupTasks.findFirst({
    where: and(eq(eventFollowupTasks.eventId, eventId), eq(eventFollowupTasks.clubId, active.clubId)),
    with: { event: true },
  });
  if (!task) throw new Error("NOT_FOUND");
  const recap = await db.query.recaps.findFirst({ where: eq(recaps.eventId, eventId) });
  if (!recap) throw new Error("RECAP_NOT_FOUND");
  const heroMediaId = s(formData, "heroMediaId") ? Number(s(formData, "heroMediaId")) : null;
  const snapshot = {
    title: s(formData, "title") || recap.title,
    kicker: s(formData, "kicker") || null,
    blurb: s(formData, "blurb") || null,
    heroMediaId,
    photoMediaIds: heroMediaId ? [heroMediaId] : [],
    videoLinks: s(formData, "videoLinks").split("\n").map((url) => url.trim()).filter(Boolean),
  };
  const revisionId = await saveRevisionDraft({
    revisionId: s(formData, "revisionId") || undefined,
    entityType: "event_followup",
    entityId: recap.id,
    clubId: active.clubId,
    baseVersion: recap.version,
    snapshot,
  });
  if (s(formData, "intent") === "submit") await submitRevision(revisionId);
  revalidatePath("/club-management/follow-up");
  redirect(`/club-management/follow-up?club=${active.clubId}`);
}
