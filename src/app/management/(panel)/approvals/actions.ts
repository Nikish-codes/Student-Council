"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { contentRevisions } from "@/db/schema";
import { reviewRevision } from "@/lib/revisions";

export async function actOnRevision(formData: FormData) {
  const revisionId = String(formData.get("revisionId") ?? "");
  const action = String(formData.get("action") ?? "") as "approve" | "request_changes" | "decline";
  const note = String(formData.get("note") ?? "").trim();
  await reviewRevision({ revisionId, action, note });
  revalidateAll();
}

export async function bulkApproveRevisions(formData: FormData) {
  const ids = String(formData.get("revisionIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  for (const id of ids) {
    try {
      await reviewRevision({ revisionId: id, action: "approve", note: "Bulk approved" });
    } catch {
      // Skip stale or already-reviewed revisions gracefully
    }
  }
  revalidateAll();
}

export async function approveAllPending(formData: FormData) {
  const clubId = Number(formData.get("clubId")) || undefined;
  const pending = await db.query.contentRevisions.findMany({
    where: and(
      eq(contentRevisions.status, "pending_review"),
      clubId ? eq(contentRevisions.clubId, clubId) : undefined,
    ),
  });
  for (const revision of pending) {
    try {
      await reviewRevision({ revisionId: revision.id, action: "approve", note: "Bulk approved" });
    } catch {
      // Skip stale or already-reviewed revisions gracefully
    }
  }
  revalidateAll();
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/clubs");
  revalidatePath("/management/approvals");
}
