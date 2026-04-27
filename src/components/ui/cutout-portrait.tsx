"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CutoutPortraitProps {
  src: string;
  alt: string;
  initials: string;
  className?: string;
  /** Drop-shadow strength so the cutout pops over the page bg */
  shadow?: "soft" | "hard";
}

/**
 * Renders a transparent-background portrait that "pops out" of the layout —
 * no card, no box, no border. If the image 404s, falls back to a giant
 * outlined display monogram on a transparent background.
 */
export function CutoutPortrait({
  src,
  alt,
  initials,
  className,
  shadow = "soft",
}: CutoutPortraitProps) {
  const [errored, setErrored] = React.useState(false);

  if (errored) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "relative grid h-full w-full place-items-center font-display italic",
          "text-[clamp(8rem,22vw,20rem)] leading-none",
          "text-transparent",
          className,
        )}
        style={{
          WebkitTextStroke: "1px rgb(255 255 255 / 0.18)",
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      draggable={false}
      className={cn(
        "h-full w-full select-none object-contain",
        shadow === "soft"
          ? "drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)]"
          : "drop-shadow-[0_40px_80px_rgba(0,0,0,0.75)]",
        className,
      )}
    />
  );
}
