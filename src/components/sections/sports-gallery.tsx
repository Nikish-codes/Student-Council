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
        className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-line/10 bg-surface/40 flex items-center justify-center"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* All slides preloaded and stacked — instant switching via opacity */}
        {images.map((url, i) => (
          <div
            key={i}
            className={cn(
              "absolute inset-0 transition-opacity duration-500 ease-out flex items-center justify-center",
              i === index ? "opacity-100" : "opacity-0",
            )}
          >
            {/* Ambient background glow matching the image colors — fills aspect-[16/9] seamlessly */}
            <Image
              src={url}
              alt=""
              fill
              aria-hidden
              className="scale-125 object-cover opacity-25 blur-2xl pointer-events-none"
              sizes="(min-width: 1024px) 1024px, 100vw"
              priority={i < 3}
              quality={40}
            />
            {/* Crisp uncropped foreground image */}
            <Image
              src={url}
              alt={`Sports gallery photo ${i + 1}`}
              fill
              className="object-contain p-2 sm:p-4"
              sizes="(min-width: 1024px) 1024px, 100vw"
              priority={i < 3}
              quality={90}
            />
          </div>
        ))}

        {/* Left arrow */}
        {count > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous image"
            className="group/arrow absolute left-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line/15 bg-bg/60 text-ink backdrop-blur-md transition-all duration-300 hover:border-line/40 hover:bg-bg/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:left-6 sm:h-14 sm:w-14"
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
            className="group/arrow absolute right-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line/15 bg-bg/60 text-ink backdrop-blur-md transition-all duration-300 hover:border-line/40 hover:bg-bg/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:right-6 sm:h-14 sm:w-14"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        )}

        {/* Dots indicator inside frosted glass pill */}
        {count > 1 && (
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center rounded-full border border-line/15 bg-bg/60 px-3 py-1 backdrop-blur-md sm:bottom-4">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to image ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className="grid h-8 w-6 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === index
                      ? "w-5 bg-ink"
                      : "w-1.5 bg-line/30 group-hover:bg-line/50",
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
