import { File as NodeFile } from "node:buffer";

import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadMediaDirect } from "./direct-media-upload";

function browserFile(): File {
  const file = new NodeFile(["a PDF"], "guide.pdf", {
    type: "application/pdf",
  });
  Object.defineProperty(file, "webkitRelativePath", { value: "" });
  return file as unknown as File;
}

function browserImage(): File {
  const file = new NodeFile(["not-real-image-bytes"], "club-night.webp", {
    type: "image/webp",
  });
  Object.defineProperty(file, "webkitRelativePath", { value: "" });
  return file as unknown as File;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("direct media upload client", () => {
  it("sends the file to R2 between two small application requests", async () => {
    const file = browserFile();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            key: "68e42942-9453-4fed-8911-7a3280b312c1-guide.pdf",
            uploadUrl: "https://example.r2.cloudflarestorage.com/signed",
            headers: {
              "Content-Type": "application/pdf",
              "x-amz-meta-uploaded-by": "7",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            media: {
              id: 12,
              url: "https://cdn.example/media/guide.pdf",
              filename: "68e42942-9453-4fed-8911-7a3280b312c1-guide.pdf",
              mimeType: "application/pdf",
              alt: "guide.pdf",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const media = await uploadMediaDirect(file);

    expect(media.id).toBe(12);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://example.r2.cloudflarestorage.com/signed",
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: "PUT",
      body: file,
    });
  });

  it("passes the club-gallery purpose through preparation and completion", async () => {
    const file = browserImage();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            key: "68e42942-9453-4fed-8911-7a3280b312c1-club-night.webp",
            uploadUrl: "https://example.r2.cloudflarestorage.com/signed",
            headers: { "Content-Type": "image/webp" },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            media: {
              id: 12,
              url: "https://cdn.example/media/club-night.webp",
              filename: "club-night.webp",
              mimeType: "image/webp",
              alt: "club-night.webp",
            },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await uploadMediaDirect(file, { purpose: "club-gallery" });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      purpose: "club-gallery",
    });
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toMatchObject({
      purpose: "club-gallery",
    });
  });

  it("turns a non-JSON Vercel 413 into a useful error", async () => {
    const file = browserFile();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("FUNCTION_PAYLOAD_TOO_LARGE", { status: 413 }),
        ),
    );

    await expect(uploadMediaDirect(file)).rejects.toThrow(
      "too large for this upload route",
    );
  });

  it("transparently falls back to server upload if direct R2 PUT fails (e.g. CORS)", async () => {
    const file = browserImage();
    const fetchMock = vi
      .fn()
      // 1. prepare
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            key: "test-key-img.webp",
            uploadUrl: "https://example.r2.cloudflarestorage.com/signed",
            headers: { "Content-Type": "image/webp" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      // 2. direct PUT throws TypeError (e.g. CORS preflight failed)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      // 3. fallback POST /api/media/upload
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            media: {
              id: 99,
              url: "https://cdn.example/media/test-key-img.webp",
              filename: "test-key-img.webp",
              mimeType: "image/webp",
              alt: "club-night.webp",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const media = await uploadMediaDirect(file);
    expect(media.id).toBe(99);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toBe("/api/media/upload");
  });
});

