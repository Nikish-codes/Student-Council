"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { contentRevisions } from "@/db/schema";
import { requireStudioClub } from "@/lib/club-studio";
import { buildApprovedClubPageSnapshot } from "@/lib/club-page-snapshot";
import {
  clubPageSnapshotSchema,
  saveRevisionDraft,
  submitRevision,
} from "@/lib/revisions";

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function savePublicMembers(formData: FormData) {
  const active = await requireStudioClub(text(formData, "clubId"));
  if (!active.canEditPage && active.membershipRole !== "president") {
    throw new Error("FORBIDDEN");
  }

  const revisionId = text(formData, "revisionId") || undefined;
  const existing = revisionId
    ? await db.query.contentRevisions.findFirst({
        where: and(
          eq(contentRevisions.id, revisionId),
          eq(contentRevisions.clubId, active.clubId),
          eq(contentRevisions.entityType, "club_page"),
          eq(contentRevisions.status, "draft"),
        ),
      })
    : null;
  const parsedExisting = existing
    ? clubPageSnapshotSchema.safeParse(existing.snapshot)
    : null;
  const base = parsedExisting?.success
    ? parsedExisting.data
    : await buildApprovedClubPageSnapshot(active.clubId);

  let people: unknown = [];
  try {
    people = JSON.parse(text(formData, "people") || "[]");
  } catch {
    throw new Error("INVALID_MEMBERS");
  }
  const snapshot = clubPageSnapshotSchema.parse({
    ...base,
    pageTemplate: "stage",
    pageTypography: "friendly",
    pageTheme: {
      background: "#0b0705",
      foreground: "#fff5e9",
      accent: base.pageTheme.accent,
      logoTreatment: "natural",
    },
    people,
  });
  const savedRevisionId = await saveRevisionDraft({
    revisionId: existing?.id,
    entityType: "club_page",
    entityId: active.clubId,
    clubId: active.clubId,
    baseVersion: Number(text(formData, "baseVersion")),
    snapshot,
  });
  if (text(formData, "intent") === "submit") {
    await submitRevision(savedRevisionId);
  }
  revalidatePath("/club-management/members");
  redirect(
    `/club-management/members?club=${active.clubId}&revision=${savedRevisionId}&saved=1`,
  );
}
