import "server-only";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { MediaUploadPurpose } from "@/lib/media-upload-policy";

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
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
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

function objectKey(key: string): string {
  return `${MEDIA_PREFIX}/${key}`;
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET || "",
      Key: objectKey(key),
      Body: body,
      ContentType: contentType,
    }),
  );
  return publicUrl(key);
}

export async function createR2UploadUrl(
  key: string,
  contentType: string,
  userId: string,
  purpose?: MediaUploadPurpose,
): Promise<{ uploadUrl: string; headers: Record<string, string> }> {
  const uploadedBy = String(userId);
  const metadata = {
    "uploaded-by": uploadedBy,
    ...(purpose ? { "upload-purpose": purpose } : {}),
  };
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET || "",
    Key: objectKey(key),
    ContentType: contentType,
    Metadata: metadata,
  });
  const signedMetadataHeaders = new Set(["x-amz-meta-uploaded-by"]);
  if (purpose) signedMetadataHeaders.add("x-amz-meta-upload-purpose");
  const uploadUrl = await getSignedUrl(client(), command, {
    expiresIn: 5 * 60,
    unhoistableHeaders: signedMetadataHeaders,
  });
  return {
    uploadUrl,
    headers: {
      "Content-Type": contentType,
      "x-amz-meta-uploaded-by": uploadedBy,
      ...(purpose ? { "x-amz-meta-upload-purpose": purpose } : {}),
    },
  };
}

export async function headR2Object(key: string) {
  const result = await client().send(
    new HeadObjectCommand({
      Bucket: process.env.R2_BUCKET || "",
      Key: objectKey(key),
    }),
  );
  return {
    size: result.ContentLength ?? 0,
    contentType: result.ContentType ?? "",
    uploadedBy: result.Metadata?.["uploaded-by"] ?? "",
    uploadPurpose: result.Metadata?.["upload-purpose"] ?? "",
  };
}

export async function deleteFromR2(key: string): Promise<void> {
  await client().send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET || "",
      Key: objectKey(key),
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
