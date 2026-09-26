"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { contentRevisions } from "@/db/schema";
import { requireReviewer } from "@/lib/rbac";
import { reviewRevision, withdrawRevision } from "@/lib/revisions";

export async function actOnRevision(formData: FormData) {
  const revisionId = String(formData.get("revisionId") ?? "");
  const action = String(formData.get("action") ?? "") as "approve" | "request_changes" | "decline";
  const note = String(formData.get("note") ?? "").trim();
  await reviewRevision({ revisionId, action, note });
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
  const now = new Date().toISOString();
  for (const id of ids) {
    try {
      await reviewRevision({ revisionId: id, action: "approve", note: "Bulk approved" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "STALE_REVISION") {
        // The base version moved — this revision can never be cleanly applied.
        // Withdraw it so it doesn't clog the queue.
        await db
          .update(contentRevisions)
          .set({
            status: "withdrawn",
            reviewNote: "Auto-withdrawn: base version moved since submission",
            updatedAt: now,
          })
          .where(eq(contentRevisions.id, id));
      }
      // Other errors (NOT_FOUND, already reviewed, etc.) are silently skipped
    }
  }
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/clubs");
  revalidatePath("/management/approvals");
}
