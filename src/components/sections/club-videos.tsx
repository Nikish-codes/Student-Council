"use client";

import * as React from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { embedSrc, youtubeThumb } from "@/lib/video";
import type { ClubVideo } from "@/lib/schemas";

/**
 * A club's video wall. The count is author-driven and unbounded — some clubs
 * will have one video, some fifteen — so the layout is derived rather than
 * fixed: the first video plays the lead role, the rest fall into a rail below it.
 *
 * Every tile is a FACADE. It renders the provider's poster frame plus a play
 * button, and only mounts the real <iframe> once clicked. That is the whole
 * reason this component exists instead of a map over <EventVideo>: fifteen live
 * YouTube embeds is ~15MB of third-party JS and roughly a second of main-thread
 * time on a mid-range phone, all of it paid before the visitor has decided to
 * watch anything. Fifteen posters is ~200KB of lazily-loaded jpeg.
 */
export function ClubVideos({ videos }: { videos: ClubVideo[] }) {
  // Anything we cannot resolve to a provider is dropped rather than rendered as
  // a broken tile — a mistyped URL in the panel shouldn't punch a hole in the page.
  const resolved = React.useMemo(
    () =>
      videos
        .map((v) => ({ ...v, embed: embedSrc(v.url) }))
        .filter((v): v is ClubVideo & { embed: NonNullable<ReturnType<typeof embedSrc>> } =>
          Boolean(v.embed),
        ),
    [videos],
  );

  if (resolved.length === 0) return null;

  const [featured, ...rest] = resolved;

  return (
    <div className="space-y-6">
      <VideoTile
        key={featured.embed.id}
        video={featured}
        priority
        className="aspect-video w-full"
      />

      {rest.length > 0 && (
        <div
          className={cn(
            "grid gap-4",
            // Two up on phones so the rail doesn't become a column of billboards.
            "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
          )}
        >
          {rest.map((v) => (
            <VideoTile key={v.embed.id} video={v} className="aspect-video w-full" />
          ))}
        </div>
      )}
    </div>
  );
}

type Resolved = ClubVideo & { embed: NonNullable<ReturnType<typeof embedSrc>> };

function VideoTile({
  video,
  className,
  priority,
}: {
  video: Resolved;
  className?: string;
  priority?: boolean;
}) {
  const [playing, setPlaying] = React.useState(false);
  const { embed, title } = video;
  const label = title?.trim() || "Club video";
  // Vimeo poster frames need an authenticated oEmbed round-trip, so those tiles
  // get the gradient placeholder instead of an image. Play still works.
  const poster = embed.provider === "youtube" ? youtubeThumb(embed.id) : undefined;

  if (playing) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-black",
          className,
        )}
      >
        <iframe
          title={label}
          src={`${embed.src}?autoplay=1&rel=0&playsinline=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play ${label}`}
      className={cn(
        // No outline — the poster fills the tile edge to edge, so a border only
        // ever drew a line around an image. The play button carries the hover.
        "group/v relative block overflow-hidden rounded-2xl bg-surface text-left",
        className,
      )}
    >
      {poster ? (
        <Image
          src={poster}
          alt=""
          fill
          // hqdefault is 480x360 (4:3) letterboxed onto our 16:9 tile — cover
          // crops the black bars off rather than showing them.
          className="object-cover transition-transform duration-700 ease-out group-hover/v:scale-[1.04]"
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          priority={priority}
          unoptimized
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-surface via-surface to-bg"
        />
      )}

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-bg/85 via-bg/10 to-transparent transition-opacity duration-500 group-hover/v:opacity-80"
      />

      {/* Play affordance */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line/25 bg-bg/60 backdrop-blur-md transition-all duration-500 group-hover/v:scale-110 group-hover/v:border-ink/40 group-hover/v:bg-ink"
      >
        <Play className="ml-0.5 h-5 w-5 fill-current text-ink transition-colors group-hover/v:text-bg" />
      </span>

      {title?.trim() ? (
        <span className="absolute inset-x-0 bottom-0 block p-4 text-pretty text-sm leading-snug text-ink sm:p-5">
          {title}
        </span>
      ) : null}
    </button>
  );
}
