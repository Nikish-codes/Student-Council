"use client";

import {
  type MediaUploadPurpose,
  validateMediaUpload,
} from "@/lib/media-upload-policy";

export type UploadedMedia = {
  id: number;
  url: string;
  filename: string | null;
  mimeType: string | null;
  alt: string;
  filesize?: number | null;
  width?: number | null;
  height?: number | null;
};

type ApiError = { error?: string };

async function readApiJson<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const text = await response.text();
  let body: (T & ApiError) | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as T & ApiError;
    } catch {
      body = null;
    }
  }
  if (!response.ok) {
    if (response.status === 413) {
      throw new Error("The file is too large for this upload route.");
    }
    throw new Error(body?.error || `${fallbackMessage} (${response.status})`);
  }
  if (!body) throw new Error(fallbackMessage);
  return body;
}

async function imageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return null;
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) return null;
    return { width: image.naturalWidth, height: image.naturalHeight };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Upload a file straight from the browser to R2, then register it in media. */
export async function uploadMediaDirect(
  file: File,
  options?: { alt?: string; purpose?: MediaUploadPurpose },
): Promise<UploadedMedia> {
  const validationError = validateMediaUpload(
    {
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    },
    options?.purpose,
  );
  if (validationError) throw new Error(validationError);

  const dimensionsPromise = imageDimensions(file);
  const prepareResponse = await fetch("/api/media/upload/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      purpose: options?.purpose,
    }),
  });
  const prepared = await readApiJson<{
    key: string;
    uploadUrl: string;
    headers: Record<string, string>;
  }>(prepareResponse, "Could not prepare the upload");

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(prepared.uploadUrl, {
      method: "PUT",
      headers: prepared.headers,
      body: file,
    });
  } catch {
    throw new Error(
      "Could not reach R2. Check the bucket CORS settings and try again.",
    );
  }
  if (!uploadResponse.ok) {
    throw new Error(`R2 rejected the upload (${uploadResponse.status}).`);
  }

  const dimensions = await dimensionsPromise;
  const completeResponse = await fetch("/api/media/upload/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: prepared.key,
      alt: options?.alt?.trim() || file.name,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      purpose: options?.purpose,
    }),
  });
  const completed = await readApiJson<{ media: UploadedMedia }>(
    completeResponse,
    "The file reached R2, but the media record could not be saved",
  );
  return completed.media;
}
