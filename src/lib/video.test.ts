import { describe, expect, it } from "vitest";
import {
  embedSrc,
  isDirectVideoUrl,
  videoThumb,
  youtubeThumb,
} from "./video";

/**
 * These URLs come from how people actually share videos — a club lead pastes
 * whatever the YouTube app's Share button gave them, which is rarely the
 * canonical /watch?v= form. Every shape below must resolve, or the video simply
 * vanishes from the club page with no error anywhere.
 */
describe("embedSrc — YouTube", () => {
  const cases: [string, string][] = [
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    // Share links carry tracking params and timestamps.
    ["https://youtu.be/dQw4w9WgXcQ?si=abc123", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ];

  it.each(cases)("resolves %s", (url, id) => {
    const embed = embedSrc(url);
    expect(embed).toMatchObject({ provider: "youtube", id });
    expect(embed?.src).toBe(`https://www.youtube.com/embed/${id}`);
  });

  it("returns an embed src with no query string of its own", () => {
    // Callers append their own params (autoplay, rel, playsinline); a src that
    // already had a "?" would produce a malformed "?a=1?b=2".
    expect(embedSrc("https://youtu.be/abc?si=x")?.src).not.toContain("?");
  });
});

describe("embedSrc — Vimeo", () => {
  it("resolves a plain video URL", () => {
    expect(embedSrc("https://vimeo.com/123456789")).toEqual({
      provider: "vimeo",
      src: "https://player.vimeo.com/video/123456789",
      id: "123456789",
    });
  });

  it("resolves an unlisted URL with a hash segment", () => {
    expect(embedSrc("https://vimeo.com/123456789/abcdef")?.id).toBe("123456789");
  });
});

describe("embedSrc — rejects", () => {
  it.each([
    ["", "empty string"],
    ["not a url", "free text"],
    ["youtube.com/watch?v=abc", "missing protocol"],
    ["https://vimeo.com/channels/staffpicks", "no numeric id"],
    ["https://example.com/video.html", "unsupported host"],
  ])("%s (%s)", (input) => {
    expect(embedSrc(input)).toBeUndefined();
  });

  it("handles undefined", () => {
    expect(embedSrc(undefined)).toBeUndefined();
  });
});

describe("isDirectVideoUrl", () => {
  it.each([
    "https://cdn.example.com/clip.mp4",
    "https://cdn.example.com/clip.webm",
    "https://cdn.example.com/CLIP.MOV",
    "https://res.cloudinary.com/demo/video/upload/sample",
  ])("accepts %s", (url) => {
    expect(isDirectVideoUrl(url)).toBe(true);
  });

  it.each([
    "https://www.youtube.com/watch?v=abc",
    "https://example.com/page.html",
    "garbage",
    "",
  ])("rejects %s", (url) => {
    expect(isDirectVideoUrl(url)).toBe(false);
  });
});

describe("thumbnails", () => {
  it("builds a YouTube poster URL on the allowlisted host", () => {
    // The host is pinned in next.config.ts images.remotePatterns; a different
    // one would throw at render time rather than degrade.
    expect(youtubeThumb("abc123")).toBe(
      "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    );
  });

  it("resolves a poster straight from a share URL", () => {
    expect(videoThumb("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });

  it("has no poster for Vimeo (needs an authenticated oEmbed call)", () => {
    expect(videoThumb("https://vimeo.com/123456789")).toBeUndefined();
  });

  it("has no poster for an unparseable URL", () => {
    expect(videoThumb("nonsense")).toBeUndefined();
  });
});
