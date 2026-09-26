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

  let directUploadSucceeded = false;
  try {
    const uploadResponse = await fetch(prepared.uploadUrl, {
      method: "PUT",
      headers: prepared.headers,
      body: file,
    });
    if (uploadResponse.ok) {
      directUploadSucceeded = true;
    }
  } catch {
    // Direct R2 upload failed (e.g. browser CORS preflight blocked).
    // Seamlessly fall back to server-proxied upload below.
    directUploadSucceeded = false;
  }

  if (!directUploadSucceeded) {
    try {
      return await uploadViaServerFallback(file, options);
    } catch (fallbackError) {
      throw new Error(
        fallbackError instanceof Error
          ? fallbackError.message
          : "Could not upload to storage. Check network and CORS settings.",
      );
    }
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

/** Fallback that uploads through Next.js server proxy when direct R2 browser PUT is blocked (e.g. CORS). */
async function uploadViaServerFallback(
  file: File,
  options?: { alt?: string; purpose?: MediaUploadPurpose },
): Promise<UploadedMedia> {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.alt) formData.append("alt", options.alt);
  if (options?.purpose) formData.append("purpose", options.purpose);

  const response = await fetch("/api/media/upload", {
    method: "POST",
    body: formData,
  });

  const data = await readApiJson<{ media: UploadedMedia }>(
    response,
    "Server-proxied upload failed",
  );
  return data.media;
}
