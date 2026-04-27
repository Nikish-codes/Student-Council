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
}

export function ParallaxImage({
  src,
  alt,
  amount = 60,
  className,
  containerClassName,
  fallbackLabel,
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
          fallbackLabel={fallbackLabel}
          className={className}
        />
      </motion.div>
    </div>
  );
}
