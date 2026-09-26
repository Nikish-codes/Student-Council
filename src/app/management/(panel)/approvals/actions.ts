"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { contentRevisions, siteSettings } from "@/db/schema";
import { requireReviewer } from "@/lib/rbac";
import { reviewRevision, withdrawRevision } from "@/lib/revisions";

export async function actOnRevision(formData: FormData) {
  const revisionId = String(formData.get("revisionId") ?? "");
  const action = String(formData.get("action") ?? "") as "approve" | "request_changes" | "decline";
  const note = String(formData.get("note") ?? "").trim();
  try {
    await reviewRevision({ revisionId, action, note, force: action === "approve" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "STALE_REVISION") {
      console.warn(`[approvals] Revision ${revisionId} is stale (base version moved).`);
    } else {
      throw error;
    }
  }
  revalidateAll();
}

export async function bulkApproveRevisions(formData: FormData) {
  await requireReviewer();
  const ids = String(formData.get("revisionIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  await approveOrWithdrawStale(ids);
  revalidateAll();
}

export async function approveAllPending(formData: FormData) {
  await requireReviewer();
  const clubId = Number(formData.get("clubId")) || undefined;
  const pending = await db.query.contentRevisions.findMany({
    where: and(
      eq(contentRevisions.status, "pending_review"),
      clubId ? eq(contentRevisions.clubId, clubId) : undefined,
    ),
  });
  await approveOrWithdrawStale(pending.map((r) => r.id));
  revalidateAll();
}

/**
 * Try to approve each revision. If it fails with STALE_REVISION, withdraw it
 * instead of silently swallowing the error so stale items don't sit in the
 * queue forever.
 */
async function approveOrWithdrawStale(ids: string[]) {
  if (ids.length === 0) return;
  const now = new Date().toISOString();

  // Fetch revisions to group by entity and process newest first
  const rows = await db.query.contentRevisions.findMany({
    where: inArray(contentRevisions.id, ids),
  });

  // Group by entityType:entityId
  const byEntity = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.entityType}:${r.entityId}`;
    const list = byEntity.get(key) ?? [];
    list.push(r);
    byEntity.set(key, list);
  }

  for (const [, list] of byEntity) {
    // Sort newest submitted first
    list.sort(
      (a, b) =>
        new Date(b.submittedAt || b.createdAt).getTime() -
        new Date(a.submittedAt || a.createdAt).getTime(),
    );

    const [newest, ...older] = list;

    // Try to approve the newest revision
    try {
      await reviewRevision({
        revisionId: newest.id,
        action: "approve",
        note: "Bulk approved",
        force: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "STALE_REVISION") {
        await db
          .update(contentRevisions)
          .set({
            status: "withdrawn",
            reviewNote: "Auto-withdrawn: base version moved since submission",
            updatedAt: now,
          })
          .where(eq(contentRevisions.id, newest.id));
      }
    }

    // Older duplicate submissions for the same entity are superseded — withdraw them cleanly
    for (const oldRev of older) {
      await db
        .update(contentRevisions)
        .set({
          status: "withdrawn",
          reviewNote: `Superseded by newer submission (${newest.id.slice(0, 8)})`,
          updatedAt: now,
        })
        .where(eq(contentRevisions.id, oldRev.id));
    }
  }
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/clubs");
  revalidatePath("/management/approvals");
}

export async function updateApprovalPolicy(formData: FormData) {
  await requireReviewer();
  const policy = String(formData.get("policy") ?? "auto_cosmetic");
  if (!["auto_cosmetic", "auto_all", "manual_all"].includes(policy)) {
    throw new Error("Invalid policy");
  }
  await db
    .insert(siteSettings)
    .values({
      id: 1,
      approvalPolicy: policy as "auto_cosmetic" | "auto_all" | "manual_all",
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: {
        approvalPolicy: policy as "auto_cosmetic" | "auto_all" | "manual_all",
        updatedAt: new Date().toISOString(),
      },
    });
  revalidateAll();
}
