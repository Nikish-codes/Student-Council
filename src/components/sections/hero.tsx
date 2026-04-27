"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { HeroCanvas } from "@/components/webgl/hero-canvas";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";
import { HeroLiveBadge } from "@/components/sections/hero-live-badge";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import type { CampusSettings, HomepageHero } from "@/lib/schemas";

const FALLBACK_WORDS = ["voices.", "futures.", "ideas.", "stories."];

export function Hero({
  data,
  campus,
}: {
  data?: HomepageHero;
  campus?: CampusSettings;
}) {
  const sublineWords =
    data?.sublineWords && data.sublineWords.length > 0
      ? data.sublineWords
      : FALLBACK_WORDS;
  const ctas = data?.ctas ?? [];
  const root = React.useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const headline = root.current!.querySelector<HTMLElement>("[data-headline]")!;
      const subline = root.current!.querySelector<HTMLElement>("[data-subline]")!;

      const splitH = new SplitText(headline, {
        type: "chars,words",
        charsClass: "char",
        wordsClass: "word",
      });
      const splitS = new SplitText(subline, {
        type: "chars,words",
        charsClass: "char",
        wordsClass: "word",
      });

      if (reduced) {
        gsap.set("[data-anim]", { opacity: 1, y: 0, scale: 1 });
        gsap.set([splitH.chars, splitS.chars], { opacity: 1, y: 0, rotateX: 0, filter: "none" });
        return;
      }

      // ── Initial states ──
      gsap.set([headline, subline], { opacity: 1 });
      gsap.set("[data-cycle-word]", { opacity: 1 });
      gsap.set("[data-vignette]", { opacity: 0 });
      gsap.set("[data-kicker-line]", { scaleX: 0, transformOrigin: "left center" });
      gsap.set("[data-kicker-text]", { opacity: 0, x: -16, filter: "blur(6px)" });
      gsap.set("[data-logo]", {
        opacity: 0,
        scale: 0.55,
        rotate: -8,
        filter: "blur(20px)",
      });
      gsap.set("[data-logo-ring]", { scale: 0.6, opacity: 0 });
      gsap.set(splitH.chars, { opacity: 0, y: 140, rotateX: -85, filter: "blur(12px)" });
      gsap.set(splitS.chars, { opacity: 0, y: 80, filter: "blur(10px)" });
      gsap.set("[data-sub]", { opacity: 0, y: 20 });
      gsap.set("[data-cta]", { opacity: 0, y: 24, scale: 0.96 });
      gsap.set("[data-meta]", { opacity: 0 });
      gsap.set("[data-meta-line]", { scaleX: 0, transformOrigin: "left center" });

      // ── Cinematic intro ──
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.to("[data-vignette]", { opacity: 1, duration: 1.2, ease: "power2.inOut" })
        .to("[data-kicker-line]", { scaleX: 1, duration: 0.7, ease: "expo.out" }, "-=0.9")
        .to("[data-kicker-text]", { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.7 }, "-=0.5")
        .to(
          "[data-logo]",
          { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)", duration: 1.4, ease: "expo.out" },
          "-=0.3",
        )
        .to("[data-logo-ring]", { scale: 1, opacity: 1, duration: 1.6, ease: "expo.out" }, "<")
        .to(
          splitH.chars,
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            filter: "blur(0px)",
            duration: 1.1,
            ease: "expo.out",
            stagger: { each: 0.035, from: "start" },
          },
          "-=1",
        )
        .to(
          splitS.chars,
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.9,
            ease: "power4.out",
            stagger: { each: 0.025, from: "start" },
          },
          "-=0.7",
        )
        .to("[data-sub]", { opacity: 1, y: 0, duration: 0.8 }, "-=0.5")
        .to(
          "[data-cta]",
          { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.08, ease: "back.out(1.6)" },
          "-=0.4",
        )
        .to("[data-meta-line]", { scaleX: 1, duration: 0.9, ease: "expo.out" }, "-=0.3")
        .to("[data-meta]", { opacity: 1, duration: 0.6 }, "-=0.6")
        .add(() => {
          gsap.to("[data-logo]", {
            y: "+=10",
            duration: 3.6,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
          gsap.to("[data-logo-ring]", {
            rotate: 360,
            duration: 60,
            ease: "none",
            repeat: -1,
            transformOrigin: "center center",
          });
        });

      // ── Scroll-driven exit ──
      gsap.to("[data-hero-stage]", {
        y: -140,
        scale: 0.94,
        opacity: 0.35,
        filter: "blur(4px)",
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });
      gsap.to("[data-hero-bg]", {
        y: 100,
        scale: 1.1,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });

      // ── Manifesto marquee drift ──
      gsap.to("[data-hero-marquee-track]", {
        xPercent: -50,
        duration: 60,
        ease: "none",
        repeat: -1,
      });

      // ── Word-cycle on subline ──
      const cycleEl = root.current?.querySelector<HTMLElement>("[data-cycle-word]");
      if (cycleEl) {
        let idx = 0;
        const tl = gsap.timeline({ repeat: -1, delay: 4 });
        sublineWords.forEach(() => {
          tl.to(cycleEl, {
            yPercent: -100,
            opacity: 0,
            filter: "blur(8px)",
            duration: 0.55,
            ease: "power3.in",
          })
            .add(() => {
              idx = (idx + 1) % sublineWords.length;
              cycleEl.textContent = sublineWords[idx];
            })
            .set(cycleEl, { yPercent: 100 })
            .to(cycleEl, {
              yPercent: 0,
              opacity: 1,
              filter: "blur(0px)",
              duration: 0.7,
              ease: "expo.out",
            })
            .to({}, { duration: 2.2 });
        });
      }
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative isolate flex min-h-[100svh] w-full flex-col justify-end overflow-hidden"
    >
      <div data-hero-bg className="absolute inset-0 -z-10 will-change-transform">
        <HeroCanvas />
        <div
          data-vignette
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_25%,rgb(10_10_10)_82%)]"
        />
      </div>

      {/* Manifesto marquee — sits behind everything, drifts forever */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[42%] -z-[5] overflow-hidden select-none"
      >
        <div
          data-hero-marquee-track
          className="flex whitespace-nowrap font-display italic text-[18vw] leading-none text-ink/[0.04] will-change-transform"
        >
          <span className="shrink-0 pr-12">
            {data?.marqueeText ?? "Of the students. For the students. By the students."} ·{" "}
          </span>
          <span className="shrink-0 pr-12">
            {data?.marqueeText ?? "Of the students. For the students. By the students."} ·{" "}
          </span>
          <span className="shrink-0 pr-12">
            {data?.marqueeText ?? "Of the students. For the students. By the students."} ·{" "}
          </span>
        </div>
      </div>

      <div className="container relative pb-16 pt-32 sm:pb-24 sm:pt-40">
        <div
          data-hero-stage
          className="grid grid-cols-1 items-end gap-16 lg:grid-cols-12 lg:gap-12"
        >
          <div className="relative order-1 flex items-center justify-center lg:order-none lg:col-span-4">
            <div className="relative aspect-square w-[clamp(220px,28vw,420px)]">
              <svg
                data-logo-ring
                aria-hidden
                viewBox="0 0 200 200"
                className="absolute inset-0 h-full w-full text-muted"
              >
                <defs>
                  <path
                    id="ring-path"
                    d="M 100,100 m -92,0 a 92,92 0 1,1 184,0 a 92,92 0 1,1 -184,0"
                  />
                </defs>
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.18"
                  strokeDasharray="2 6"
                />
                <text
                  fontSize="6"
                  fill="currentColor"
                  fillOpacity="0.55"
                  letterSpacing="3"
                >
                  <textPath href="#ring-path" startOffset="0">
                    WOXSEN UNIVERSITY · STUDENT COUNCIL · SESSION 2025/26 · EMPOWERING STUDENT VOICES · 
                  </textPath>
                </text>
              </svg>
              <div data-logo className="absolute inset-[14%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/sc-white.png"
                  alt="Woxsen Student Council emblem"
                  className="h-full w-full object-contain drop-shadow-[0_0_60px_rgba(255,255,255,0.18)]"
                />
              </div>
            </div>
          </div>

          <div className="order-2 flex flex-col gap-9 lg:order-none lg:col-span-8">
            <div className="flex items-center gap-3">
              <span data-kicker-line className="block h-px w-14 bg-line/50" aria-hidden />
              <span data-kicker-text className="kicker">
                {data?.kicker ?? "Woxsen Student Council · Session 2025/26"}
              </span>
            </div>

            <h1
              data-headline
              data-anim
              className="display text-[clamp(3rem,9.5vw,9rem)] leading-[0.9] tracking-tightest"
              style={{ perspective: "800px" }}
            >
              {data?.headline ?? "Empowering"}
            </h1>
            <h2
              data-subline
              data-anim
              className="display -mt-4 flex flex-wrap items-baseline gap-x-[0.3em] text-[clamp(2.5rem,8vw,7.5rem)] italic leading-[0.95] text-muted"
            >
              <span>{data?.sublineLead ?? "student"}</span>
              <span
                aria-hidden
                className="relative inline-block overflow-hidden align-baseline"
                style={{ minWidth: "5ch" }}
              >
                <span data-cycle-word className="inline-block">
                  {sublineWords[0]}
                </span>
              </span>
              <span className="sr-only">
                {(data?.sublineLead ?? "student") + " " + sublineWords[0]}
              </span>
            </h2>

            <p data-sub className="max-w-2xl text-balance text-base text-muted sm:text-lg">
              {data?.subParagraph ??
                "The official portal of the Woxsen Student Council — events, clubs, leadership, and the support channels that keep campus moving."}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              {(ctas.length > 0
                ? ctas
                : [
                    { label: "Explore events", href: "/events", variant: "primary" as const },
                    { label: "Raise a concern", href: "/support#grievance-form", variant: "outline" as const },
                    { label: "Meet the team", href: "/council", variant: "ghost" as const },
                  ]
              ).map((cta, i) => (
                <div data-cta key={`${cta.href}-${i}`}>
                  {cta.variant === "primary" ? (
                    <Magnetic>
                      <Button asChild size="lg">
                        <Link href={cta.href}>
                          {cta.label}{" "}
                          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                        </Link>
                      </Button>
                    </Magnetic>
                  ) : (
                    <Button asChild variant={cta.variant} size="lg">
                      <Link href={cta.href}>{cta.label}</Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 sm:mt-24">
          <div data-meta-line className="hairline mb-6" aria-hidden />
          <div data-meta className="flex items-center justify-between gap-6 text-xs text-muted">
            <div className="flex items-center gap-3">
              <ArrowDown className="h-3 w-3 animate-bounce" aria-hidden />
              <span className="kicker">Scroll to explore</span>
            </div>
            <span className="hidden sm:block">
              <HeroLiveBadge campus={campus} />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
