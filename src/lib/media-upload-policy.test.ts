import { describe, expect, it } from "vitest";

import {
  CLUB_GALLERY_UPLOAD_MAX_BYTES,
  MEDIA_UPLOAD_MAX_BYTES,
  isSafeMediaKey,
  validateMediaUpload,
} from "./media-upload-policy";

describe("media upload policy", () => {
  it("accepts supported files up to and including 25 MB", () => {
    expect(
      validateMediaUpload({
        filename: "council-photo.jpg",
        mimeType: "image/jpeg",
        size: MEDIA_UPLOAD_MAX_BYTES,
      }),
    ).toBeNull();
  });

  it("limits club galleries to image files no larger than 4 MB", () => {
    expect(
      validateMediaUpload(
        {
          filename: "club-night.webp",
          mimeType: "image/webp",
          size: CLUB_GALLERY_UPLOAD_MAX_BYTES,
        },
        "club-gallery",
      ),
    ).toBeNull();
    expect(
      validateMediaUpload(
        {
          filename: "club-night.png",
          mimeType: "image/png",
          size: CLUB_GALLERY_UPLOAD_MAX_BYTES + 1,
        },
        "club-gallery",
      ),
    ).toContain("under 4 MB");
    expect(
      validateMediaUpload(
        {
          filename: "club-night.mp4",
          mimeType: "video/mp4",
          size: 1024,
        },
        "club-gallery",
      ),
    ).toContain("only accept image");
  });

  it("rejects oversized, empty, and unsupported files", () => {
    expect(
      validateMediaUpload({
        filename: "large.png",
        mimeType: "image/png",
        size: MEDIA_UPLOAD_MAX_BYTES + 1,
      }),
    ).toContain("25 MB");
    expect(
      validateMediaUpload({
        filename: "empty.png",
        mimeType: "image/png",
        size: 0,
      }),
    ).toContain("empty");
    expect(
      validateMediaUpload({
        filename: "page.html",
        mimeType: "text/html",
        size: 200,
      }),
    ).toContain("Only images");
  });

  it("accepts only generated media object keys", () => {
    expect(
      isSafeMediaKey(
        "68e42942-9453-4fed-8911-7a3280b312c1-student-council.webp",
      ),
    ).toBe(true);
    expect(isSafeMediaKey("../../private-file")).toBe(false);
    expect(isSafeMediaKey("media/arbitrary.jpg")).toBe(false);
  });
});
