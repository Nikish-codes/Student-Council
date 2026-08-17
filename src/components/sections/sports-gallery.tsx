"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 5000;

export function SportsGallery({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = images.length;

  const go = useCallback(
    (dir: number) => setIndex((i) => (i + dir + count) % count),
    [count],
  );

  // Auto-advance unless paused (hover) or only one image
  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = setInterval(() => go(1), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [count, paused, go]);

  if (count === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-surface/40">
          <div className="grid h-full place-items-center">
            <span className="display text-3xl text-subtle">
              Gallery coming soon
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div
        className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-surface/40"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* All slides preloaded and stacked — instant switching via opacity */}
        {images.map((url, i) => (
          <div
            key={i}
            className={cn(
              "absolute inset-0 transition-opacity duration-500 ease-out",
              i === index ? "opacity-100" : "opacity-0",
            )}
          >
            <Image
              src={url}
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 1024px, 100vw"
              priority={i < 3}
              quality={80}
            />
          </div>
        ))}

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg/40 via-transparent to-bg/80" />

        {/* Left arrow */}
        {count > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous image"
            className="group/arrow absolute left-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line/15 bg-bg/50 text-ink backdrop-blur-md transition-all duration-300 hover:border-line/40 hover:bg-bg/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:left-6 sm:h-14 sm:w-14"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        )}

        {/* Right arrow */}
        {count > 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next image"
            className="group/arrow absolute right-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line/15 bg-bg/50 text-ink backdrop-blur-md transition-all duration-300 hover:border-line/40 hover:bg-bg/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:right-6 sm:h-14 sm:w-14"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        )}

        {/* Dots indicator */}
        {count > 1 && (
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 sm:bottom-4">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to image ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className="grid h-11 w-7 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i === index
                      ? "w-6 bg-ink"
                      : "w-2 bg-line/30 group-hover:bg-line/50",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
