"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

interface PictureProps
  extends Omit<ImageProps, "src" | "alt" | "width" | "height" | "fill"> {
  src: string;
  alt: string;
  /** When true, renders with next/image fill mode (parent must be relative) */
  fill?: boolean;
  /** Width when not in fill mode */
  width?: number;
  /** Height when not in fill mode */
  height?: number;
  fallbackLabel?: string;
  /** Mark as priority (above-the-fold LCP) */
  priority?: boolean;
  /** Responsive sizes hint (defaults sensible for grids) */
  sizes?: string;
}

/**
 * next/image wrapper with a graceful styled placeholder if the asset
 * is missing or fails to load. Defaults to lazy + responsive.
 */
export function Picture({
  src,
  alt,
  fill,
  width,
  height,
  fallbackLabel,
  className,
  priority,
  sizes = "(min-width: 1280px) 320px, (min-width: 768px) 50vw, 100vw",
  quality = 78,
  ...props
}: PictureProps) {
  const [errored, setErrored] = React.useState(false);

  if (errored || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "relative grid place-items-center bg-surface-2 text-subtle",
          fill ? "absolute inset-0 h-full w-full" : "h-full w-full",
          className,
        )}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgb(255 255 255 / 0.04) 0 1px, transparent 1px 14px)",
          }}
        />
        <span className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">
          {fallbackLabel ?? "Image"}
        </span>
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        quality={quality}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        onError={() => setErrored(true)}
        className={cn("object-cover", className)}
        {...props}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 800}
      height={height ?? 600}
      sizes={sizes}
      quality={quality}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      onError={() => setErrored(true)}
      className={cn("h-auto w-full", className)}
      {...props}
    />
  );
}
