"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  speed?: number; // seconds per loop
  pauseOnHover?: boolean;
  reverse?: boolean;
}

export function Marquee({
  speed = 40,
  pauseOnHover = true,
  reverse = false,
  className,
  children,
}: MarqueeProps) {
  return (
    <div
      className={cn(
        "group relative flex w-full overflow-hidden mask-fade-x",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-12 pr-12",
          "animate-marquee will-change-transform motion-reduce:animate-none motion-reduce:transform-none",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
        )}
        style={{
          animationDuration: `${speed}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
