"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { embedSrc, isDirectVideoUrl } from "@/lib/video";

// Re-exported for existing importers; the implementation now lives in lib/video.
export { isDirectVideoUrl };

type EventVideoProps = {
  src?: string;
  title: string;
  poster?: string;
  variant?: "player" | "background";
  autoPlay?: boolean;
  controls?: boolean;
  fit?: "cover" | "contain";
  className?: string;
};

export function EventVideo({ src, title, poster, variant = "player", autoPlay = false, controls = true, fit = "cover", className }: EventVideoProps) {
  const [failed, setFailed] = React.useState(false);
  const [aspectRatio, setAspectRatio] = React.useState<string>();
  const [orientation, setOrientation] = React.useState<"portrait" | "landscape">("landscape");
  if (!src || failed) return null;

  const direct = isDirectVideoUrl(src);
  if (variant === "background") {
    if (!direct) return null;
    return (
      <video
        aria-label={`${title} video`}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />
    );
  }

  if (direct) {
    const mediaClass = controls
      ? "h-full w-full bg-black object-cover"
      : cn(
          "block bg-black",
          "pointer-events-none [&::-webkit-media-controls]:hidden [&::-webkit-media-controls-enclosure]:hidden",
          fit === "contain"
            ? orientation === "portrait"
              ? "mx-auto h-auto max-h-[72vh] w-auto max-w-[min(100%,30rem)] object-contain"
              : "mx-auto h-auto max-h-[72vh] w-full max-w-5xl object-contain"
            : "h-full w-full object-cover",
        );
    const sharedProps = {
      src,
      poster,
      autoPlay,
      muted: autoPlay,
      loop: autoPlay,
      playsInline: true,
      preload: "metadata" as const,
      disablePictureInPicture: true,
      controlsList: "nodownload nofullscreen noremoteplayback",
      onLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = event.currentTarget;
        if (video.videoWidth && video.videoHeight) {
          setAspectRatio(`${video.videoWidth} / ${video.videoHeight}`);
          setOrientation(video.videoHeight > video.videoWidth ? "portrait" : "landscape");
        }
      },
      onError: () => setFailed(true),
      style: aspectRatio ? { aspectRatio } : undefined,
      className: cn(mediaClass, className),
    };

    if (!controls) {
      return (
        <video
          {...sharedProps}
          aria-label={`${title} looping event video`}
          tabIndex={-1}
        />
      );
    }

    return (
      <video
        {...sharedProps}
        controls={controls}
      />
    );
  }

  const embed = embedSrc(src);
  if (embed) {
    const params = new URLSearchParams();
    if (autoPlay) {
      params.set("autoplay", "1");
      params.set("mute", "1");
      params.set("muted", "1");
      params.set("loop", "1");
      params.set("playsinline", "1");
      if (embed.provider === "youtube") params.set("playlist", embed.id);
      if (embed.provider === "vimeo") params.set("background", controls ? "0" : "1");
    }
    if (!controls) params.set("controls", "0");
    const embeddedSrc = params.size ? `${embed.src}?${params.toString()}` : embed.src;
    return (
      <iframe
        title={`${title} video`}
        src={embeddedSrc}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className={cn("aspect-video h-auto w-full border-0 bg-black", className)}
      />
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "grid aspect-video min-h-64 w-full place-items-center bg-black/70 p-6 text-center text-sm text-ink transition hover:bg-black/50",
        className,
      )}
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-line/20 bg-bg/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em]">
        Open event video <ExternalLink className="h-3.5 w-3.5" />
      </span>
    </a>
  );
}
