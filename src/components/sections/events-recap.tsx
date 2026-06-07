"use client";

import * as React from "react";
import Image from "next/image";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

type RecapMedia =
  | { kind: "video"; src: string; poster?: string }
  | { kind: "image"; src: string };

interface RecapStory {
  id: string;
  index: string; // "01", "02"
  date: string; // "OCT · 2025"
  title: string;
  category: string;
  blurb: string;
  hero: RecapMedia;
  gallery: RecapMedia[];
  stats?: { label: string; value: string }[];
}

const STORIES: RecapStory[] = [
  {
    id: "infinity-26",
    index: "01",
    date: "MAR · 2026",
    title: "Infinity '26",
    category: "Flagship · Cultural Fest",
    blurb:
      "Three days. Twelve venues. Unstructured infinity. The Council's biggest production of the year — and we shipped it together.",
    hero: { kind: "video", src: "/recap/infinity-26-aftermovie.mp4" },
    gallery: [
      { kind: "video", src: "/recap/infinity-26-wrap.mp4" },
      { kind: "image", src: "/recap/infinity-26-trailer.jpg" },
      { kind: "image", src: "/recap/infinity-26-logo.jpg" },
    ],
    stats: [
      { label: "Days", value: "03" },
      { label: "Stages", value: "12" },
      { label: "Footfall", value: "8K+" },
    ],
  },
  {
    id: "halloween-25",
    index: "02",
    date: "OCT · 2025",
    title: "Halloween '25",
    category: "Cultural · Jashn",
    blurb:
      "When the lights dimmed and the spooky took over. A night of costumes, chills, and pure Halloween chaos under the campus sky.",
    hero: { kind: "video", src: "/recap/halloween-25-recap.mp4" },
    gallery: [
      { kind: "image", src: "/recap/halloween-25-a.jpg" },
      { kind: "image", src: "/recap/halloween-25-b.jpg" },
    ],
  },
  {
    id: "utopia-esports",
    index: "03",
    date: "FEB · 2026",
    title: "Utopia Esports — Post-game Glow",
    category: "Tech · Gaming",
    blurb:
      "FC25, MK and the gaming community in one room — that feeling right after the final match. The community Utopia is building, on tape.",
    hero: { kind: "video", src: "/recap/utopia-esports.mp4" },
    gallery: [],
  },
  {
    id: "kathakriti",
    index: "04",
    date: "NOV · 2025",
    title: "Kathakriti — Day 01",
    category: "Literature · Culture",
    blurb:
      "From game stalls to verbal-olympics-level debates — Kathakriti opened with the kind of energy you want every literature event to have.",
    hero: { kind: "image", src: "/recap/kathakriti-day1.webp" },
    gallery: [{ kind: "image", src: "/recap/council-throwback.jpg" }],
  },
];

export function EventsRecap() {
  const root = React.useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const ctx = gsap.context(() => {
        const headline = root.current?.querySelector<HTMLElement>("[data-recap-headline]");
        if (headline) {
          gsap.set(headline, { opacity: 1 });
          if (!reduced) {
            const split = new SplitText(headline, { type: "words" });
            gsap.set(split.words, { opacity: 0, y: 40, filter: "blur(8px)" });
            gsap.to(split.words, {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.9,
              ease: "expo.out",
              stagger: 0.06,
              scrollTrigger: { trigger: headline, start: "top 85%", once: true },
            });
          }
        }

        root.current?.querySelectorAll<HTMLElement>("[data-recap-story]").forEach((story) => {
          const bits = story.querySelectorAll<HTMLElement>("[data-recap-bit]");
          if (bits.length) {
            gsap.set(bits, { opacity: 1 });
            if (!reduced) {
              gsap.from(bits, {
                y: 30,
                opacity: 0,
                duration: 0.9,
                ease: "expo.out",
                stagger: 0.07,
                scrollTrigger: { trigger: story, start: "top 80%", once: true },
              });
            }
          }
          const hero = story.querySelector<HTMLElement>("[data-recap-hero]");
          if (hero && !reduced) {
            gsap.from(hero, {
              opacity: 0,
              scale: 1.04,
              duration: 1.4,
              ease: "expo.out",
              scrollTrigger: { trigger: story, start: "top 80%", once: true },
            });
          }
        });
      }, root);
      return () => ctx.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="container mt-40 sm:mt-40">
      <div className="mb-14 flex items-end justify-between gap-6 border-t border-line/10 pt-10">
        <div>
          <span className="kicker">Recap · this session</span>
          <h2
            data-recap-headline
            className="display mt-6 text-5xl leading-[0.95] sm:text-7xl"
          >
            What we&apos;ve already <span className="italic text-accent">shipped.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-pretty text-muted">
            Receipts. Photos, aftermovies, and the moments that made it. Mute on
            the videos — they&apos;re for atmosphere.
          </p>
        </div>
        <span className="hidden font-mono text-xs text-subtle sm:block">
          {String(STORIES.length).padStart(2, "0")} stories
        </span>
      </div>

      <div className="space-y-32 sm:space-y-40">
        {STORIES.map((s, i) => (
          <Story key={s.id} story={s} flipped={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

function Story({ story, flipped }: { story: RecapStory; flipped: boolean }) {
  return (
    <article
      data-recap-story
      className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16"
    >
      {/* Hero media */}
      <div
        data-recap-hero
        className={cn("relative lg:col-span-7", flipped && "lg:order-2")}
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line/15 bg-surface/40 sm:aspect-[16/10] lg:aspect-[5/6]">
          <Media media={story.hero} priority={false} />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-bg/40 via-transparent to-transparent"
          />
          <div className="absolute left-5 top-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/80">
            <span
              className="h-1.5 w-1.5 rounded-full bg-ink"
              style={{ boxShadow: "0 0 8px currentColor" }}
              aria-hidden
            />
            Recap · {story.date}
          </div>
        </div>

        {/* Gallery strip */}
        {story.gallery.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            {story.gallery.slice(0, 3).map((g, i) => (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-xl border border-line/10 bg-surface/40"
              >
                <Media media={g} priority={false} small />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div
        className={cn(
          "flex flex-col gap-6 lg:col-span-5",
          flipped && "lg:order-1",
        )}
      >
        <div data-recap-bit className="flex items-center gap-3">
          <span className="font-mono text-xs text-subtle">{story.index} / {String(STORIES.length).padStart(2, "0")}</span>
          <span className="h-px w-14 bg-line/30" aria-hidden />
          <span className="kicker">{story.category}</span>
        </div>
        <h3
          data-recap-bit
          className="display text-balance text-4xl leading-[0.95] text-ink sm:text-5xl lg:text-6xl"
        >
          {story.title}
        </h3>
        <p
          data-recap-bit
          className="max-w-xl text-pretty text-base text-muted sm:text-lg"
        >
          {story.blurb}
        </p>
        {story.stats && (
          <div
            data-recap-bit
            className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line/10 bg-line/[0.04]"
          >
            {story.stats.map((st) => (
              <div key={st.label} className="flex flex-col gap-2 bg-bg p-5">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">
                  {st.label}
                </span>
                <span className="display text-3xl tabular-nums text-ink sm:text-4xl">
                  {st.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

/* ─────────────── Lazy media ─────────────── */

function Media({
  media,
  priority,
  small = false,
}: {
  media: RecapMedia;
  priority: boolean;
  small?: boolean;
}) {
  if (media.kind === "image") {
    return (
      <Image
        src={media.src}
        alt=""
        fill
        sizes={small ? "20vw" : "(min-width: 1024px) 60vw, 100vw"}
        quality={small ? 70 : 80}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        className="object-cover"
      />
    );
  }
  return <LazyVideo src={media.src} poster={media.poster} />;
}

function LazyVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShouldLoad(true);
            // Try to play once metadata is ready
            const tryPlay = () => {
              el.play().catch(() => {});
            };
            if (el.readyState >= 2) tryPlay();
            else el.addEventListener("loadeddata", tryPlay, { once: true });
          } else {
            el.pause();
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={shouldLoad ? src : undefined}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
