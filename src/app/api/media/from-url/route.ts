import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/db/client";
import { media as mediaT } from "@/db/schema";
import { requireOps } from "@/lib/rbac";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // 25MB — same cap as file uploads

/**
 * Host allowlist for remote ingestion. Mirrors `images.remotePatterns` in
 * next.config.ts so an accepted URL also renders through next/image. Anything
 * else is rejected to keep this from becoming an open SSRF proxy: the server
 * fetches the URL, so the hostname must be one we already trust for images.
 *
 * A `*.` prefix matches that subdomain tree (e.g. `*.r2.dev`).
 */
const ALLOWED_HOSTS = [
  "pub-88f0a7c5d200469fa7dbb8f90c605d45.r2.dev",
  "*.r2.dev",
  "res.cloudinary.com",
  "*.cloudinary.com",
];

function hostAllowed(hostname: string): boolean {
  return ALLOWED_HOSTS.some((h) =>
    h.startsWith("*.") ? hostname.endsWith(h.slice(1)) : hostname === h,
  );
}

/**
 * Ingest a remote image URL into the media library without re-hosting it.
 * Validates the host, fetches with a size guard, derives dimensions via sharp,
 * and inserts an mp_media row whose `url` is the original remote URL. Returns
 * the new media record so MediaField can reference it by id — keeping the
 * integer-FK data model intact while letting admins paste a Cloudinary link.
 */
export async function POST(req: Request) {
  try {
    await requireOps();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let url: string;
  let alt: string;
  try {
    const body = await req.json();
    url = String(body?.url ?? "").trim();
    alt = String(body?.alt ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (parsed.protocol !== "https:") {
    return NextResponse.json({ error: "URL must be https" }, { status: 400 });
  }
  if (!hostAllowed(parsed.hostname)) {
    return NextResponse.json(
      { error: "Host not allowed — use R2 or Cloudinary" },
      { status: 400 },
    );
  }

  // Fetch with a hard size cap so a mislabelled multi-GB file can't OOM the
  // server. Abort once we exceed MAX_BYTES so we fail fast rather than buffer
  // the whole thing.
  let buf: Buffer;
  let contentType: string | null = null;
  try {
    const res = await fetch(parsed.toString(), { redirect: "follow" });
    if (!res.ok || !res.body) {
      return NextResponse.json(
        { error: `Fetch failed (${res.status})` },
        { status: 502 },
      );
    }
    contentType = res.headers.get("content-type");
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        return NextResponse.json(
          { error: "File too large (max 25MB)" },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    buf = Buffer.concat(chunks);
  } catch {
    return NextResponse.json(
      { error: "Could not fetch the image" },
      { status: 502 },
    );
  }

  // Derive real dimensions + mime with sharp. Non-fatal: a non-image URL still
  // gets stored (the preview will surface a broken-image fallback), but we
  // prefer to reject early so the library doesn't fill with junk.
  let width: number | null = null;
  let height: number | null = null;
  let mime: string | null = contentType;
  try {
    const meta = await sharp(buf).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
    if (meta.format) mime = `image/${meta.format}`;
  } catch {
    return NextResponse.json(
      { error: "URL did not resolve to a valid image" },
      { status: 415 },
    );
  }

  const label = alt || parsed.pathname.split("/").filter(Boolean).pop() || "Pasted image";

  try {
    const [row] = await db
      .insert(mediaT)
      .values({
        alt: label,
        url: parsed.toString(),
        filename: label,
        mimeType: mime,
        filesize: buf.byteLength,
        width,
        height,
        tags: [],
      })
      .returning();
    return NextResponse.json({ media: row });
  } catch (err) {
    console.error("[media/from-url] failed:", err);
    return NextResponse.json(
      { error: "Could not save the media record" },
      { status: 502 },
    );
  }
}
