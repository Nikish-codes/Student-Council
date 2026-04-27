"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

interface ReelStage {
  id: string;
  number: string;
  title: string;
  year: string;
  caption: string;
  src?: string; // video src
  poster: string;
  isImage?: boolean;
}

const STAGES: ReelStage[] = [
  {
    id: "infinity-26",
    number: "01",
    title: "Infinity '26",
    year: "MAR · 2026",
    caption: "The aftermovie. Three nights compressed into ninety seconds.",
    src: "/recap/infinity-26-aftermovie.mp4",
    poster: "/recap/infinity-26-trailer.jpg",
  },
  {
    id: "halloween-25",
    number: "02",
    title: "Halloween '25",
    year: "OCT · 2025",
    caption: "A campus that became a haunted house for one night.",
    src: "/recap/halloween-25-recap.mp4",
    poster: "/recap/halloween-25-a.jpg",
  },
  {
    id: "utopia-esports",
    number: "03",
    title: "Utopia · Esports",
    year: "FEB · 2026",
    caption: "FC25, MK, and the post-game roar.",
    src: "/recap/utopia-esports.mp4",
    poster: "/recap/infinity-26-logo.jpg",
  },
  {
    id: "kathakriti",
    number: "04",
    title: "Kathakriti",
    year: "NOV · 2025",
    caption: "Literature, debates, and the loudest quiet on campus.",
    poster: "/recap/kathakriti-day1.webp",
    isImage: true,
  },
];

export function HomeReel() {
  const root = React.useRef<HTMLElement>(null);
  const videoRefs = React.useRef<Array<HTMLVideoElement | null>>([]);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const section = root.current;
      if (!section) return;

      const stages = gsap.utils.toArray<HTMLElement>("[data-reel-stage]", section);
      const counter = section.querySelector<HTMLElement>("[data-reel-counter]");
      const progressBar = section.querySelector<HTMLElement>("[data-reel-progress]");

      // Initial state
      stages.forEach((stage, i) => {
        gsap.set(stage, {
          clipPath: i === 0 ? "inset(0% 0 0 0)" : "inset(100% 0 0 0)",
          zIndex: i + 1,
        });
      });

      const playStage = (idx: number) => {
        videoRefs.current.forEach((v, i) => {
          if (!v) return;
          if (i === idx) {
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
        if (counter) counter.textContent = STAGES[idx]?.number ?? "01";
      };

      playStage(0);

      const transitions = stages.length - 1; // number of clip-path reveals

      const ctx = gsap.context(() => {
        if (reduced) {
          // Reduced-motion: skip the pin, render as a vertical stack
          stages.forEach((stage) =>
            gsap.set(stage, { clipPath: "inset(0% 0 0 0)", position: "relative", height: "60vh" }),
          );
          return;
        }

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${window.innerHeight * transitions * 1.4}`,
            pin: "[data-reel-pin]",
            scrub: 0.6,
            anticipatePin: 1,
            onUpdate: (self) => {
              const idx = Math.min(transitions, Math.floor(self.progress * stages.length * 0.999));
              playStage(idx);
              if (progressBar) {
                gsap.set(progressBar, { scaleX: self.progress });
              }
            },
          },
        });

        for (let i = 1; i < stages.length; i++) {
          tl.to(stages[i], { clipPath: "inset(0% 0 0 0)", duration: 1, ease: "power2.inOut" });
        }
      }, root);

      return () => {
        ctx.revert();
        ScrollTrigger.refresh();
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative bg-black"
      aria-label="Cinematic reel of past events"
    >
      {/* Intro band */}
      <div className="relative border-y border-line/8 bg-bg">
        <div className="mx-auto max-w-[1720px] px-6 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-7">
            <div className="kicker mb-4 text-ink">◉ The Reel · 04 chapters</div>
            <h2
              className="display text-ink leading-[0.9]"
              style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}
            >
              Scroll the year.<br />
              <span className="italic text-muted">Watch what we built.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:text-right">
            <p className="text-muted text-base sm:text-lg max-w-md lg:ml-auto leading-snug">
              Pinned. Scroll-paced. One frame at a time. The flagship moments of the year, cut into a single cinematic descent.
            </p>
          </div>
        </div>
      </div>

      {/* Pinned stage */}
      <div data-reel-pin className="relative h-screen w-full overflow-hidden bg-black">
        {STAGES.map((stage, i) => (
          <div
            key={stage.id}
            data-reel-stage
            data-reel-i={i}
            className="absolute inset-0 will-change-[clip-path]"
          >
            {stage.isImage || !stage.src ? (
              <Image
                src={stage.poster}
                alt={stage.title}
                fill
                sizes="100vw"
                className="object-cover"
              />
            ) : (
              <video
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                src={stage.src}
                poster={stage.poster}
                muted
                loop
                playsInline
                preload={i === 0 ? "auto" : "metadata"}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}

            {/* Letterbox — taller bottom bar = stage for text */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-black" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-black" />
            {/* Bottom-anchored scrim that guarantees caption legibility */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.65) 25%, rgba(0,0,0,0.3) 55%, transparent 100%)",
              }}
            />
            {/* Soft global vignette */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_30%,rgba(0,0,0,0.45)_90%)]" />
            <div
              className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-25"
              style={{ background: "linear-gradient(180deg, #1a0f08 0%, #050505 100%)" }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E\")",
              }}
            />

            {/* Per-stage caption */}
            <div className="absolute inset-x-0 bottom-28 z-10">
              <div className="mx-auto max-w-[1720px] px-6 lg:px-10 flex items-end justify-between gap-6">
                <div className="max-w-2xl">
                  <div
                    className="kicker mb-3 text-ink"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
                  >
                    {stage.year}
                  </div>
                  <div
                    className="display text-ink leading-[0.9]"
                    style={{
                      fontSize: "clamp(2.2rem, 5vw, 4.2rem)",
                      textShadow: "0 1px 2px rgba(0,0,0,0.6), 0 10px 30px rgba(0,0,0,0.45)",
                    }}
                  >
                    {stage.title}
                  </div>
                  <p
                    className="mt-3 text-ink text-base sm:text-lg max-w-md"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.4)" }}
                  >
                    {stage.caption}
                  </p>
                </div>
                <div
                  className="hidden md:block font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink text-right"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
                >
                  Chapter<br />
                  <span
                    className="display italic text-ink text-5xl block leading-none mt-1"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.45)" }}
                  >
                    {stage.number}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Top-fixed counter + progress */}
        <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
          <div className="mx-auto max-w-[1720px] px-6 lg:px-10 pt-6 flex items-center justify-between font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink/70">
            <span>
              <span data-reel-counter className="text-ink">01</span>
              <span className="text-subtle"> / 0{STAGES.length}</span>
            </span>
            <span className="text-ink">The Reel</span>
            <span className="hidden sm:inline">Scroll to advance ↓</span>
          </div>
          <div className="mt-4 h-px w-full bg-ink/10">
            <div
              data-reel-progress
              className="h-full w-full origin-left bg-ink"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
        </div>
      </div>

      {/* Outro band */}
      <div className="relative border-y border-line/8 bg-bg">
        <div className="mx-auto max-w-[1720px] px-6 py-10 lg:py-12 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
          <div>
            <div className="kicker mb-3 text-muted">End of reel</div>
            <p className="text-ink text-xl sm:text-2xl max-w-2xl leading-snug">
              That was the year. The next one is already in production.
            </p>
          </div>
          <Link
            href="/events"
            className="inline-flex items-center gap-3 text-sm font-mono uppercase tracking-[0.2em] text-ink border-b border-ink/40 pb-1 hover:border-ink transition-colors self-start sm:self-auto"
          >
            Go to the archive
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
