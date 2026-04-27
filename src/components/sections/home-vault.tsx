"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap, prefersSimpleTextMotion, SplitText, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { VaultStory } from "@/lib/schemas";

type VaultMedia =
  | { kind: "video"; src: string; poster?: string }
  | { kind: "image"; src: string };

interface VaultEntry {
  id: string;
  index: string;
  kicker: string;
  title: string;
  year: string;
  line: string;
  media: VaultMedia;
  thumb: string; // thumbnail for chip
  href: string;
}

const FALLBACK_ENTRIES: VaultEntry[] = [
  {
    id: "infinity-26",
    index: "01",
    kicker: "FLAGSHIP · CULTURAL FEST",
    title: "Infinity",
    year: "'26",
    line: "Three days. Twelve venues. Unstructured infinity — the council's biggest production of the year.",
    media: {
      kind: "video",
      src: "/recap/infinity-26-aftermovie.mp4",
      poster: "/recap/infinity-26-trailer.jpg",
    },
    thumb: "/recap/infinity-26-trailer.jpg",
    href: "/events",
  },
  {
    id: "halloween-25",
    index: "02",
    kicker: "JASHN · CULTURAL",
    title: "Halloween",
    year: "'25",
    line: "When the lights dimmed and the spooky took over — costumes, chills, and pure chaos under the campus sky.",
    media: {
      kind: "video",
      src: "/recap/halloween-25-recap.mp4",
      poster: "/recap/halloween-25-a.jpg",
    },
    thumb: "/recap/halloween-25-a.jpg",
    href: "/events",
  },
  {
    id: "utopia-esports",
    index: "03",
    kicker: "TECH · GAMING",
    title: "Utopia",
    year: "'26",
    line: "FC25, MK, and the gaming community in one room — the post-game glow, on tape.",
    media: {
      kind: "video",
      src: "/recap/utopia-esports.mp4",
    },
    thumb: "/recap/infinity-26-logo.jpg",
    href: "/events",
  },
  {
    id: "kathakriti",
    index: "04",
    kicker: "LITERATURE · CULTURE",
    title: "Kathakriti",
    year: "'25",
    line: "From game stalls to verbal-olympics-level debates — the kind of energy you want every literature event to have.",
    media: { kind: "image", src: "/recap/kathakriti-day1.webp" },
    thumb: "/recap/kathakriti-day1.webp",
    href: "/events",
  },
];

function storyToEntry(s: VaultStory, i: number): VaultEntry {
  const year = s.publishedAt
    ? `'${new Date(s.publishedAt).getFullYear().toString().slice(-2)}`
    : "";
  return {
    id: s.id,
    index: String(i + 1).padStart(2, "0"),
    kicker: s.kicker || "RECAP",
    title: s.title,
    year,
    line: s.blurb,
    media: s.videoUrl
      ? { kind: "video", src: s.videoUrl, poster: s.posterImage }
      : { kind: "image", src: s.posterImage },
    thumb: s.posterImage,
    href: s.href,
  };
}

const ROTATE_MS = 8500;

export function HomeVault({ entries }: { entries?: VaultStory[] }) {
  const ENTRIES =
    entries && entries.length > 0
      ? entries.map(storyToEntry)
      : FALLBACK_ENTRIES;
  const root = React.useRef<HTMLElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const idleTimer = React.useRef<number | null>(null);
  const isHovering = React.useRef(false);
  const [active, setActive] = React.useState(0);
  const [muted, setMuted] = React.useState(true);
  const [paused, setPaused] = React.useState(false);
  const videoRefs = React.useRef<Array<HTMLVideoElement | null>>([]);

  // Idle-fade for the overlay group (scrims + caption + controls).
  // Default: TRANSLUCENT so the video shows through. The overlay snaps to
  // full opacity while the mouse is moving over the stage, then fades back
  // to translucent ~1.4s after the mouse stops moving (or on mouse leave).
  const FADE_IDLE_MS = 1400;
  const FADE_DIM_OPACITY = 0.15;
  const reducedMotion = React.useRef(false);
  React.useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Set the initial translucent state on mount so the video is visible from
  // page load, before the user has moved the mouse.
  React.useEffect(() => {
    const els = stageRef.current?.querySelectorAll<HTMLElement>("[data-vault-fade]");
    if (!els || !els.length) return;
    gsap.set(els, { opacity: reducedMotion.current ? 1 : FADE_DIM_OPACITY });
  }, []);

  const fadeTo = React.useCallback((opacity: number, duration: number) => {
    const els = stageRef.current?.querySelectorAll<HTMLElement>("[data-vault-fade]");
    if (!els || !els.length) return;
    gsap.to(els, { opacity, duration, ease: "power2.out", overwrite: "auto" });
  }, []);

  const showOverlay = React.useCallback(() => fadeTo(1, 0.25), [fadeTo]);
  const dimOverlay = React.useCallback(
    () => fadeTo(FADE_DIM_OPACITY, 0.6),
    [fadeTo],
  );

  const armIdleTimer = React.useCallback(() => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      dimOverlay();
    }, FADE_IDLE_MS);
  }, [dimOverlay]);

  const handleStageEnter = React.useCallback(() => {
    if (reducedMotion.current) return;
    isHovering.current = true;
    setPaused(true);
    showOverlay();
    armIdleTimer();
  }, [showOverlay, armIdleTimer]);

  const handleStageMove = React.useCallback(() => {
    if (reducedMotion.current || !isHovering.current) return;
    showOverlay();
    armIdleTimer();
  }, [showOverlay, armIdleTimer]);

  const handleStageLeave = React.useCallback(() => {
    isHovering.current = false;
    setPaused(false);
    if (idleTimer.current) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
    dimOverlay();
  }, [dimOverlay]);

  React.useEffect(() => {
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, []);

  // Auto-rotate
  React.useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % ENTRIES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  // Play active video, pause others
  React.useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) {
        v.currentTime = 0;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [active]);

  // Intro animation
  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const simpleText = prefersSimpleTextMotion();
      const ctx = gsap.context(() => {
        const headline = root.current?.querySelector<HTMLElement>("[data-vault-title]");
        const meta = root.current?.querySelectorAll<HTMLElement>("[data-vault-bit]");
        const chips = root.current?.querySelectorAll<HTMLElement>("[data-vault-chip]");

        if (headline) {
          gsap.set(headline, { opacity: 1 });
          if (reduced) {
            gsap.set(headline, { opacity: 1, y: 0 });
          } else if (simpleText) {
            gsap.from(headline, { opacity: 0, y: 24, duration: 0.7, ease: "power2.out" });
          } else {
            const split = new SplitText(headline, { type: "chars,words" });
            gsap.from(split.chars, {
              opacity: 0,
              y: 80,
              rotateX: -50,
              duration: 1.1,
              stagger: 0.025,
              ease: "power3.out",
            });
          }
        }
        if (meta) {
          gsap.set(meta, { opacity: 1 });
          if (!reduced) {
            gsap.from(meta, { opacity: 0, y: 20, stagger: 0.08, duration: 0.7, delay: 0.4 });
          }
        }
        if (chips) {
          gsap.set(chips, { opacity: 1 });
          if (!reduced) {
            gsap.from(chips, {
              opacity: 0,
              y: 30,
              stagger: 0.06,
              duration: 0.6,
              delay: 0.7,
            });
          }
        }
      }, root);
      return () => ctx.revert();
    },
    { scope: root },
  );

  // Crossfade animation when active changes
  React.useEffect(() => {
    const layers = root.current?.querySelectorAll<HTMLElement>("[data-vault-layer]");
    if (!layers) return;
    layers.forEach((el, i) => {
      gsap.to(el, {
        opacity: i === active ? 1 : 0,
        scale: i === active ? 1 : 1.04,
        duration: 1.2,
        ease: "power2.out",
      });
    });
    // Animate the title swap
    const titleSwap = root.current?.querySelector<HTMLElement>("[data-vault-swap]");
    if (titleSwap) {
      gsap.fromTo(
        titleSwap,
        { opacity: 0, y: 20, filter: "blur(8px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "power2.out" },
      );
    }
  }, [active]);

  const current = ENTRIES[active];

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      videoRefs.current.forEach((v) => {
        if (v) v.muted = next;
      });
      return next;
    });
  };

  return (
    <section
      ref={root}
      className="relative bg-bg overflow-hidden"
      aria-label="The Council Vault — past events"
    >
      {/* Top kicker rail */}
      <div className="relative z-20 border-y border-line/8 bg-bg/80 backdrop-blur">
        <div className="mx-auto max-w-[1720px] px-6 py-4 flex items-center justify-between gap-6 text-[0.6875rem] font-mono uppercase tracking-[0.22em] text-subtle">
          <span data-vault-bit className="text-ink">
            ◉ The Vault · Past Events
          </span>
          <span data-vault-bit className="hidden sm:inline">
            Auto-cycling · Hover to pause
          </span>
          <span data-vault-bit>
            <Link href="/events" className="text-muted hover:text-ink transition-colors">
              Full archive →
            </Link>
          </span>
        </div>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className="relative h-[min(92vh,920px)] w-full overflow-hidden"
        onMouseEnter={handleStageEnter}
        onMouseMove={handleStageMove}
        onMouseLeave={handleStageLeave}
      >
        {/* Letterbox bars — bottom is taller to give text a stage */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-10 bg-bg" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-20 bg-bg" />

        {/* Media layers */}
        {ENTRIES.map((entry, i) => (
          <div
            key={entry.id}
            data-vault-layer
            className="absolute inset-0"
            style={{ opacity: i === 0 ? 1 : 0 }}
          >
            {entry.media.kind === "video" ? (
              <video
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                className="absolute inset-0 h-full w-full object-cover"
                src={entry.media.src}
                poster={entry.media.poster}
                muted={muted}
                loop
                playsInline
                preload={i === 0 ? "auto" : "metadata"}
              />
            ) : (
              <Image
                src={entry.media.src}
                alt={entry.title}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
            )}
          </div>
        ))}

        {/* Diagonal scrim — only enough to anchor caption, never blackens video */}
        <div
          data-vault-fade
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(105deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.32) 22%, rgba(0,0,0,0.16) 42%, rgba(0,0,0,0.05) 60%, transparent 75%)",
          }}
        />
        {/* Bottom anchor scrim — soft fade so caption reads but video shows through */}
        <div
          data-vault-fade
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/3"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.28) 28%, rgba(0,0,0,0.08) 55%, transparent 100%)",
          }}
        />
        {/* Soft global vignette — kept very subtle */}
        <div
          data-vault-fade
          className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_60%_40%,transparent_45%,rgba(0,0,0,0.18)_90%,rgba(0,0,0,0.32)_100%)]"
        />
        {/* Grain */}
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E\")",
          }}
        />

        {/* Overlay content — anchored to bottom-left, not center */}
        <div data-vault-fade className="absolute inset-0 z-20 flex flex-col">
          <div className="flex-1 flex items-end pb-28 sm:pb-32">
            <div className="mx-auto w-full max-w-[1720px] px-6 lg:px-10">
              <div data-vault-swap key={current.id} className="max-w-2xl">
                <div
                  data-vault-bit
                  className="kicker mb-5 flex items-center gap-3 text-ink"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink animate-pulse" />
                  {current.kicker}
                </div>
                <h2
                  data-vault-title
                  className="display text-ink leading-[0.85] mb-6"
                  style={{
                    fontSize: "clamp(3.5rem, 10vw, 9.5rem)",
                    textShadow:
                      "0 1px 2px rgba(0,0,0,0.55), 0 12px 40px rgba(0,0,0,0.45)",
                  }}
                >
                  {current.title}
                  <span className="italic text-muted ml-3 text-[0.6em] align-baseline">
                    {current.year}
                  </span>
                </h2>
                <p
                  data-vault-bit
                  className="text-lg sm:text-xl text-ink max-w-xl leading-snug mb-8"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.4)" }}
                >
                  {current.line}
                </p>
                <Link
                  href={current.href}
                  data-vault-bit
                  className="inline-flex items-center gap-3 text-sm font-mono uppercase tracking-[0.2em] text-ink border-b border-ink/40 pb-1 hover:border-ink transition-colors"
                >
                  Open the recap
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Mute toggle */}
        {current.media.kind === "video" && (
          <button
            data-vault-fade
            type="button"
            onClick={toggleMute}
            className="absolute right-6 top-20 z-40 inline-flex items-center gap-2 rounded-full border border-ink/30 bg-bg/40 px-4 py-2 text-[0.6875rem] font-mono uppercase tracking-[0.22em] text-ink backdrop-blur hover:bg-bg/70 transition-colors"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink" />
            {muted ? "Unmute" : "Mute"}
          </button>
        )}

        {/* Index counter */}
        <div data-vault-fade className="absolute left-6 top-20 z-40 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink/70">
          <div className="text-ink">
            {current.index} <span className="text-subtle">/ 0{ENTRIES.length}</span>
          </div>
        </div>
      </div>

      {/* Chip selector strip */}
      <div className="relative z-20 border-y border-line/8 bg-bg">
        <div className="mx-auto max-w-[1720px] px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ENTRIES.map((entry, i) => {
              const isActive = i === active;
              return (
                <button
                  key={entry.id}
                  data-vault-chip
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    "group relative overflow-hidden text-left transition-all",
                    "aspect-[16/9] md:aspect-[16/7]",
                  )}
                  aria-label={`Show ${entry.title}`}
                >
                  <Image
                    src={entry.thumb}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className={cn(
                      "object-cover transition-all duration-500",
                      isActive ? "grayscale-0 scale-100" : "grayscale scale-105 opacity-60 group-hover:opacity-90 group-hover:grayscale-0",
                    )}
                  />
                  <div
                    className={cn(
                      "absolute inset-0 transition-opacity",
                      isActive
                        ? "bg-gradient-to-t from-bg/95 via-bg/30 to-transparent"
                        : "bg-bg/40 group-hover:bg-bg/20",
                    )}
                  />
                  <div className="absolute inset-0 flex flex-col justify-between p-3">
                    <div className="flex items-center justify-between font-mono text-[0.625rem] uppercase tracking-[0.22em]">
                      <span className={cn(isActive ? "text-ink" : "text-ink/70")}>
                        {entry.index}
                      </span>
                      {isActive && (
                        <span className="flex items-center gap-1.5 text-ink">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink animate-pulse" />
                          Now playing
                        </span>
                      )}
                    </div>
                    <div>
                      <div
                        className={cn(
                          "display leading-none transition-colors",
                          isActive ? "text-ink" : "text-ink/85 group-hover:text-ink",
                        )}
                        style={{ fontSize: "clamp(1.1rem, 2vw, 1.6rem)" }}
                      >
                        {entry.title}
                        <span className="italic text-muted ml-1 text-[0.7em]">
                          {entry.year}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Active underline */}
                  <div
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-0.5 origin-left transition-transform duration-500",
                      isActive ? "bg-ink scale-x-100" : "bg-ink/30 scale-x-0 group-hover:scale-x-100",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
