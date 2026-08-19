import { NextResponse } from "next/server";

import { makeKey, createR2UploadUrl } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import { requireMediaContributor } from "@/lib/rbac";
import {
  mediaUploadPurpose,
  type MediaUploadPurpose,
  validateMediaUpload,
} from "@/lib/media-upload-policy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let user;
  try {
    user = await requireMediaContributor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`media-upload:${user.id}`, 60, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many upload attempts. Wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let input: {
    filename: string;
    mimeType: string;
    size: number;
    purpose?: MediaUploadPurpose;
  };
  try {
    const body = await request.json();
    input = {
      filename: String(body?.filename ?? "").trim(),
      mimeType: String(body?.mimeType ?? "")
        .trim()
        .toLowerCase(),
      size: Number(body?.size),
      purpose: mediaUploadPurpose(body?.purpose),
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid upload request" },
      { status: 400 },
    );
  }

  const validationError = validateMediaUpload(input, input.purpose);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const key = makeKey(input.filename);
    const signed = await createR2UploadUrl(
      key,
      input.mimeType,
      user.id,
      input.purpose,
    );
    return NextResponse.json({ key, ...signed });
  } catch (error) {
    console.error("[media/upload/prepare] failed:", error);
    return NextResponse.json(
      { error: "Could not prepare the R2 upload. Please try again." },
      { status: 502 },
    );
  }
}
