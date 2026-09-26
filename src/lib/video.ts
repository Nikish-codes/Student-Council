/**
 * Video URL parsing, shared by the event player (`components/ui/event-video.tsx`)
 * and the club video wall (`components/sections/club-videos.tsx`).
 *
 * These used to live privately inside event-video.tsx; they were lifted here so
 * the club page could reuse them rather than grow a second, drifting copy of
 * "which YouTube URL shapes do we accept". Pure functions — no DOM, no server
 * deps — so they are unit-testable and safe to import from either side.
 */

export type VideoProvider = "youtube" | "vimeo";

export type VideoEmbed = {
  provider: VideoProvider;
  /** Embed URL with no query string; callers append their own params. */
  src: string;
  id: string;
};

/**
 * Accepts every YouTube URL shape people actually paste: youtu.be/<id>,
 * /watch?v=<id>, /shorts/<id> and /embed/<id>.
 */
export function youtubeId(url: URL): string | undefined {
  if (url.hostname.includes("youtu.be")) {
    return url.pathname.split("/").filter(Boolean)[0];
  }
  if (url.hostname.includes("youtube.com")) {
    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/").filter(Boolean)[1];
    }
    if (url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/").filter(Boolean)[1];
    }
    return url.searchParams.get("v") || undefined;
  }
  return undefined;
}

export function vimeoId(url: URL): string | undefined {
  if (!url.hostname.includes("vimeo.com")) return undefined;
  return url.pathname
    .split("/")
    .filter((part) => /^\d+$/.test(part))
    .at(-1);
}

/** Resolve any supported share URL to its embed target, or undefined. */
export function embedSrc(src?: string): VideoEmbed | undefined {
  if (!src) return undefined;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return undefined;
  }
  const yt = youtubeId(url);
  if (yt) {
    return { provider: "youtube", src: `https://www.youtube.com/embed/${yt}`, id: yt };
  }
  const vm = vimeoId(url);
  if (vm) {
    return { provider: "vimeo", src: `https://player.vimeo.com/video/${vm}`, id: vm };
  }
  return undefined;
}

/** True for URLs a plain <video> element can play directly. */
export function isDirectVideoUrl(src?: string): boolean {
  if (!src) return false;
  try {
    const url = new URL(src);
    const path = url.pathname.toLowerCase();
    return (
      /\.(mp4|webm|ogg|ogv|mov|m4v)$/.test(path) ||
      (url.hostname.includes("res.cloudinary.com") &&
        path.includes("/video/upload/"))
    );
  } catch {
    return false;
  }
}

/**
 * Poster frame for a YouTube video. This is what makes the click-to-load facade
 * cheap: one ~15KB jpeg per video instead of a ~1MB player iframe. `hqdefault`
 * exists for every video (maxresdefault 404s on older/low-res uploads).
 */
export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Poster frame for any supported provider; undefined when we have none. */
export function videoThumb(src?: string): string | undefined {
  const embed = embedSrc(src);
  // Vimeo thumbnails need an authenticated oEmbed round-trip, so those tiles
  // fall back to the club's own cover image instead.
  return embed?.provider === "youtube" ? youtubeThumb(embed.id) : undefined;
}

/** Returns true if the URL is an Instagram post or reel URL. */
export function isInstagramVideoUrl(src?: string): boolean {
  if (!src) return false;
  try {
    const url = new URL(src);
    return (
      url.hostname.includes("instagram.com") ||
      url.hostname.includes("instagr.am")
    );
  } catch {
    return false;
  }
}

/**
 * Validates that a URL is playable by our video player:
 * - YouTube (youtube.com, youtu.be, shorts)
 * - Vimeo (vimeo.com)
 * - Direct video file (.mp4, .webm, etc.)
 *
 * Instagram URLs explicitly return false.
 */
export function isValidVideoUrl(src?: string): boolean {
  if (!src) return false;
  if (isInstagramVideoUrl(src)) return false;
  return Boolean(embedSrc(src) || isDirectVideoUrl(src));
}

