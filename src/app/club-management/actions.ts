"use server";

import { revalidatePath } from "next/cache";

import { withdrawRevision } from "@/lib/revisions";

export async function withdrawClubRevision(formData: FormData) {
  const revisionId = String(formData.get("revisionId") ?? "").trim();
  if (!revisionId) throw new Error("REVISION_REQUIRED");
  await withdrawRevision(revisionId);
  revalidatePath("/club-management");
  revalidatePath("/club-management/events");
  revalidatePath("/club-management/page-editor");
  revalidatePath("/club-management/follow-up");
}
