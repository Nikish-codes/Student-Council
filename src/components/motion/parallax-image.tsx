"use client";

import * as React from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Picture } from "@/components/ui/picture";
import { cn } from "@/lib/utils";

interface ParallaxImageProps {
  src: string;
  alt: string;
  amount?: number;
  className?: string;
  containerClassName?: string;
  fallbackLabel?: string;
  /**
   * Width this image occupies, for srcset selection. Defaults to full-bleed
   * because that is what a parallax image almost always is.
   *
   * This used to be missing entirely, so every caller silently inherited
   * Picture's grid-card default of `(min-width: 1280px) 320px` — the browser
   * fetched a 320px file for a full-width banner and upscaled it, which reads
   * as a stretched, soft image rather than as a missing attribute.
   */
  sizes?: string;
}

export function ParallaxImage({
  src,
  alt,
  amount = 60,
  className,
  containerClassName,
  fallbackLabel,
  sizes = "100vw",
}: ParallaxImageProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [reduced ? 0 : -amount, reduced ? 0 : amount],
  );

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line/[0.08] bg-surface-2",
        containerClassName,
      )}
    >
      <motion.div style={{ y }} className="absolute inset-x-0 -inset-y-[10%]">
        <Picture
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          fallbackLabel={fallbackLabel}
          className={className}
        />
      </motion.div>
    </div>
  );
}
