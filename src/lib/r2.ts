import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 (S3-compatible) client + helpers. Reuses the same R2_* env the
 * project already had configured for Payload's storage. Files are stored under
 * the `media/` prefix; the public URL is `${R2_PUBLIC_URL}/media/<key>`.
 */
const MEDIA_PREFIX = "media";

let cached: S3Client | null = null;
function client(): S3Client {
  if (cached) return cached;
  cached = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });
  return cached;
}

export function publicUrl(key: string): string {
  const base = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  return `${base}/${MEDIA_PREFIX}/${key}`;
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET || "",
      Key: `${MEDIA_PREFIX}/${key}`,
      Body: body,
      ContentType: contentType,
    }),
  );
  return publicUrl(key);
}

export async function deleteFromR2(key: string): Promise<void> {
  await client().send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET || "",
      Key: `${MEDIA_PREFIX}/${key}`,
    }),
  );
}

/** Safe object key from a filename: lowercased, hyphenated, uuid-prefixed. */
export function makeKey(filename: string): string {
  const clean = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
  return `${crypto.randomUUID()}-${clean || "file"}`;
}
