"use server";

import { revalidatePath } from "next/cache";

import { reviewRevision } from "@/lib/revisions";

export async function actOnRevision(formData: FormData) {
  const revisionId = String(formData.get("revisionId") ?? "");
  const action = String(formData.get("action") ?? "") as "approve" | "request_changes" | "decline";
  const note = String(formData.get("note") ?? "").trim();
  await reviewRevision({ revisionId, action, note });
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/clubs");
  revalidatePath("/management/approvals");
}
