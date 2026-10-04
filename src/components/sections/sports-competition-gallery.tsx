"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Maximize2, ExternalLink, Download, X } from "lucide-react";

export type GalleryImageItem = {
  id: number;
  url: string;
  alt?: string | null;
};

export function SportsCompetitionGallery({
  images,
  title = "League Gallery",
}: {
  images: GalleryImageItem[];
  title?: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const count = images.length;

  const next = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((i) => (i! + 1) % count);
  }, [selectedIndex, count]);

  const prev = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((i) => (i! - 1 + count) % count);
  }, [selectedIndex, count]);

  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, next, prev]);

  if (count === 0) return null;

  const current = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <section aria-labelledby="competition-gallery-heading" className="mb-16">
      <div className="mb-6 flex items-baseline justify-between border-b border-line/10 pb-4">
        <div>
          <span className="kicker text-accent">Highlights & Moments</span>
          <h2
            id="competition-gallery-heading"
            className="display mt-1 text-3xl sm:text-4xl text-ink"
          >
            {title}
          </h2>
        </div>
        <span className="font-mono text-xs uppercase tracking-wider text-subtle">
          {count} {count === 1 ? "photo" : "photos"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
        {images.map((img, idx) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setSelectedIndex(idx)}
            className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-line/15 bg-surface/30 transition-all duration-300 hover:border-line/40 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent flex items-center justify-center cursor-zoom-in"
          >
            {/* Ambient blur glow */}
            <Image
              src={img.url}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="scale-125 object-cover opacity-20 blur-lg pointer-events-none"
            />
            {/* Foreground image - uncropped */}
            <Image
              src={img.url}
              alt={img.alt || `Gallery photo ${idx + 1}`}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />

            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-bg/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end justify-end p-2 pointer-events-none">
              <span className="rounded-full bg-bg/90 p-1.5 shadow-md backdrop-blur-md text-ink">
                <Maximize2 className="h-3.5 w-3.5 text-accent" />
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      <Dialog.Root
        open={selectedIndex !== null}
        onOpenChange={(open) => !open && setSelectedIndex(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-bg/90 backdrop-blur-md animate-fade-in" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-2 sm:inset-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-line/20 bg-surface p-4 sm:p-6 shadow-2xl focus:outline-none"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-line/10 pb-4">
              <div>
                <Dialog.Title className="display text-base sm:text-lg text-ink">
                  {title}
                </Dialog.Title>
                <p className="font-mono text-xs text-muted">
                  {selectedIndex !== null ? `${selectedIndex + 1} of ${count}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {current ? (
                  <>
                    <a
                      href={current.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-line/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-muted hover:text-ink"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Full image ↗</span>
                    </a>
                    <a
                      href={current.url}
                      download={`sports-photo-${current.id}`}
                      className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-line/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-muted hover:text-ink"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </a>
                  </>
                ) : null}

                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close modal"
                    className="grid h-9 w-9 place-items-center rounded-lg border border-line/20 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            <div className="relative mt-4 flex-1 overflow-hidden flex items-center justify-center rounded-xl bg-bg/60 p-2 sm:p-4">
              {current ? (
                <div className="relative h-full w-full">
                  {/* Ambient background glow */}
                  <Image
                    src={current.url}
                    alt=""
                    fill
                    sizes="100vw"
                    className="scale-110 object-cover opacity-20 blur-xl pointer-events-none"
                  />
                  {/* Main display photo */}
                  <Image
                    src={current.url}
                    alt={current.alt || "Gallery image"}
                    fill
                    sizes="100vw"
                    className="object-contain"
                    priority
                  />
                </div>
              ) : null}

              {/* Prev / Next buttons */}
              {count > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      prev();
                    }}
                    aria-label="Previous photo"
                    className="absolute left-4 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full border border-line/20 bg-bg/80 text-ink shadow-lg backdrop-blur-md transition-transform hover:scale-110 hover:bg-bg"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      next();
                    }}
                    aria-label="Next photo"
                    className="absolute right-4 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full border border-line/20 bg-bg/80 text-ink shadow-lg backdrop-blur-md transition-transform hover:scale-110 hover:bg-bg"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
