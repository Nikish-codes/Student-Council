import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { media as mediaT } from "@/db/schema";
import {
  mediaUploadPurpose,
  isSafeMediaKey,
  validateMediaUpload,
} from "@/lib/media-upload-policy";
import { deleteFromR2, headR2Object, publicUrl } from "@/lib/r2";
import { requireMediaContributor } from "@/lib/rbac";

export const runtime = "nodejs";

function dimension(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 100_000
    ? parsed
    : null;
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireMediaContributor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input: {
    key: string;
    alt: string;
    width: number | null;
    height: number | null;
    purpose?: "club-gallery";
  };
  try {
    const body = await request.json();
    input = {
      key: String(body?.key ?? "").trim(),
      alt: String(body?.alt ?? "")
        .trim()
        .slice(0, 300),
      width: dimension(body?.width),
      height: dimension(body?.height),
      purpose: mediaUploadPurpose(body?.purpose),
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid completion request" },
      { status: 400 },
    );
  }

  if (!isSafeMediaKey(input.key)) {
    return NextResponse.json({ error: "Invalid media key" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(mediaT)
    .where(eq(mediaT.filename, input.key))
    .limit(1);
  if (existing) return NextResponse.json({ media: existing });

  try {
    const object = await headR2Object(input.key);
    const objectPurpose = mediaUploadPurpose(object.uploadPurpose);
    const dimensionsValid =
      !object.contentType.startsWith("image/") ||
      (input.width !== null && input.height !== null);
    const isValid =
      object.uploadedBy === String(user.id) &&
      objectPurpose === input.purpose &&
      validateMediaUpload(
        {
          filename: input.key,
          mimeType: object.contentType,
          size: object.size,
        },
        objectPurpose,
      ) === null &&
      dimensionsValid;
    if (!isValid) {
      await deleteFromR2(input.key).catch(() => undefined);
      return NextResponse.json(
        { error: "The uploaded file failed verification and was removed." },
        { status: 422 },
      );
    }

    const [row] = await db
      .insert(mediaT)
      .values({
        alt: input.alt || "Untitled upload",
        url: publicUrl(input.key),
        filename: input.key,
        mimeType: object.contentType,
        filesize: object.size,
        width: object.contentType.startsWith("image/") ? input.width : null,
        height: object.contentType.startsWith("image/") ? input.height : null,
        tags: [],
      })
      .returning();
    revalidatePath("/management/media");
    return NextResponse.json({ media: row });
  } catch (error) {
    console.error("[media/upload/complete] failed:", error);
    return NextResponse.json(
      { error: "R2 could not verify the upload. Please try again." },
      { status: 502 },
    );
  }
}
