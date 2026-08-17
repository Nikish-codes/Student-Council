import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/db/client";
import { media as mediaT } from "@/db/schema";
import { requireMediaContributor } from "@/lib/rbac";
import { uploadToR2, makeKey } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED = /^(image\/|video\/|application\/pdf)/;

/**
 * Server-proxied media upload: receives a file, stores it in R2, derives image
 * dimensions with sharp, and inserts an mp_media row. Returns the new media
 * record so the caller can reference it by id immediately.
 */
export async function POST(req: Request) {
  try {
    await requireMediaContributor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const alt = String(form.get("alt") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 413 });
  }
  if (!ALLOWED.test(file.type)) {
    return NextResponse.json(
      { error: "Only images, video, and PDF are allowed" },
      { status: 415 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  let width: number | null = null;
  let height: number | null = null;
  if (file.type.startsWith("image/")) {
    try {
      const meta = await sharp(buf).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      /* non-fatal: store without dimensions */
    }
  }

  const key = makeKey(file.name || "upload");

  try {
    const url = await uploadToR2(key, buf, file.type || "application/octet-stream");
    const [row] = await db
      .insert(mediaT)
      .values({
        alt: alt || file.name || "Untitled",
        url,
        filename: key,
        mimeType: file.type || null,
        filesize: file.size,
        width,
        height,
        tags: [],
      })
      .returning();
    return NextResponse.json({ media: row });
  } catch (err) {
    console.error("[media/upload] failed:", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 502 },
    );
  }
}
