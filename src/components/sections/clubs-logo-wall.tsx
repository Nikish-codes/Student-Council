"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { gsap, prefersSimpleTextMotion, SplitText, useGSAP } from "@/lib/gsap";
import { localClubLogo } from "@/lib/club-logos";
import type { Club } from "@/lib/schemas";

/** Prefer the edge-served /public logo; fall back to the R2 URL. */
function logoSrc(club: Club): string {
  return localClubLogo(club.slug) ?? club.logo;
}

/**
 * Clubs "spotlight cloud".
 *
 * A calm hairline grid of every club logo rendered as a dim, ink-tinted
 * silhouette via CSS `mask-image` (the logo's alpha → the shape). A soft glow
 * trails the cursor; the full-colour logos are revealed only inside a radial
 * mask centred on that glow — the "flashlight" effect. On idle / touch devices
 * the glow gently auto-roams so the section always feels alive.
 *
 * Performance: the silhouettes are pure CSS masks (no next/image optimizer),
 * and each unique logo URL is fetched once and reused, so the whole cloud costs
 * a handful of cached requests instead of ~100 optimizer round-trips.
 */
export function ClubsLogoWall({ clubs }: { clubs: Club[] }) {
  const root = React.useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduced) return;

      const headline = root.current?.querySelector<HTMLElement>(
        "[data-clubs-headline]",
      );
      if (!headline) return;

      gsap.set(headline, { opacity: 1 });
      if (prefersSimpleTextMotion()) {
        gsap.from(headline, {
          opacity: 0,
          y: 24,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: { trigger: headline, start: "top 85%", once: true },
        });
        return;
      }

      const split = new SplitText(headline, {
        type: "chars,words",
        charsClass: "char",
      });
      gsap.set(split.chars, { opacity: 0, y: 100, rotateX: -70, filter: "blur(10px)" });
      gsap.to(split.chars, {
        opacity: 1,
        y: 0,
        rotateX: 0,
        filter: "blur(0px)",
        duration: 1,
        ease: "expo.out",
        stagger: { each: 0.022 },
        scrollTrigger: { trigger: headline, start: "top 85%", once: true },
      });
    },
    { scope: root },
  );

  if (clubs.length === 0) return null;

  return (
    <section
      ref={root}
      aria-label="Student clubs"
      className="relative overflow-hidden border-t border-line/10 bg-bg py-28 sm:py-40"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.05),transparent_45%)]" />

      <div className="container relative z-10">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-14 bg-line/30" aria-hidden />
              <span className="kicker">{clubs.length} communities · one council</span>
            </div>
            <h2
              data-clubs-headline
              className="display text-balance text-5xl leading-[0.92] sm:text-7xl lg:text-8xl"
              style={{ perspective: "800px" }}
            >
              <span className="block">Find your</span>
              <span className="block italic text-muted">people.</span>
            </h2>
          </div>
          <Link
            href="/clubs"
            className="group/all inline-flex items-center gap-3 self-start text-sm text-ink sm:self-end"
          >
            <span className="kicker">Explore all clubs</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/all:translate-x-1" />
          </Link>
        </div>

        <SpotlightCloud clubs={clubs} />

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">
          Move your cursor through the cloud · tap a logo to explore
        </p>

        <div className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-3 border-t border-line/10 pt-6 text-center">
          <MiniStat value={clubs.length} label="Clubs" />
          <MiniStat value={uniqueTagCount(clubs)} label="Tags" />
          <MiniStat
            value={clubs.reduce((sum, c) => sum + (c.members ?? 0), 0) || "—"}
            label="Members"
          />
        </div>
      </div>
    </section>
  );
}

const GRID_CLS =
  "grid grid-cols-3 gap-px sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8";

function SpotlightCloud({ clubs }: { clubs: Club[] }) {
  const wrap = React.useRef<HTMLDivElement>(null);
  const target = React.useRef({ x: 0, y: 0, active: false });
  const pos = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.current = { x: e.clientX - r.left, y: e.clientY - r.top, active: true };
    };
    const onLeave = () => {
      target.current.active = false;
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const r = el.getBoundingClientRect();
      let tx = target.current.x;
      let ty = target.current.y;
      if (!target.current.active) {
        // Idle / touch: gently roam the glow on a slow Lissajous path.
        const k = reduced ? 0 : 1;
        tx = r.width / 2 + Math.cos(t / 2300) * r.width * 0.33 * k;
        ty = r.height / 2 + Math.sin(t / 1700) * r.height * 0.36 * k;
      }
      pos.current.x += (tx - pos.current.x) * 0.1;
      pos.current.y += (ty - pos.current.y) * 0.1;
      el.style.setProperty("--mx", `${pos.current.x}px`);
      el.style.setProperty("--my", `${pos.current.y}px`);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const reveal =
    "radial-gradient(circle 150px at var(--mx, 50%) var(--my, 50%), #000 0%, #000 32%, transparent 72%)";

  return (
    <div
      ref={wrap}
      className="relative overflow-hidden border border-line/10 bg-line/[0.06]"
      style={{ "--mx": "50%", "--my": "50%" } as React.CSSProperties}
    >
      {/* Base: dim monochrome silhouettes (interactive). */}
      <div className={GRID_CLS}>
        {clubs.map((club) => (
          <MonoCell key={club.slug} club={club} />
        ))}
      </div>

      {/* Reveal: full-colour logos, shown only inside the cursor glow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ maskImage: reveal, WebkitMaskImage: reveal }}
      >
        <div className={GRID_CLS}>
          {clubs.map((club) => (
            <ColorCell key={club.slug} club={club} />
          ))}
        </div>
      </div>

      {/* Aura: soft glow halo trailing the cursor. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle 230px at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.09), transparent 70%)",
        }}
      />
    </div>
  );
}

function MonoCell({ club }: { club: Club }) {
  const src = logoSrc(club);
  return (
    <Link
      href="/clubs"
      aria-label={club.name}
      className="group/cell relative flex aspect-[5/3] items-center justify-center bg-bg transition-colors duration-200 hover:bg-surface/40"
    >
      {src ? (
        <span
          aria-hidden
          className="absolute inset-[18%] bg-ink/30 transition-colors duration-300 group-hover/cell:bg-ink/60"
          style={{
            maskImage: `url("${src}")`,
            WebkitMaskImage: `url("${src}")`,
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            maskSize: "contain",
            WebkitMaskSize: "contain",
          }}
        />
      ) : (
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-subtle">
          {club.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="pointer-events-none absolute inset-x-1 bottom-1.5 truncate text-center font-mono text-[8px] uppercase tracking-[0.16em] text-muted opacity-0 transition-opacity duration-200 group-hover/cell:opacity-100">
        {club.name}
      </span>
    </Link>
  );
}

function ColorCell({ club }: { club: Club }) {
  const src = logoSrc(club);
  return (
    <div className="relative aspect-[5/3]">
      {src ? (
        <div className="absolute inset-[18%]">
          <Image
            src={src}
            alt=""
            fill
            unoptimized
            sizes="160px"
            className="object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}

function MiniStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div className="display text-2xl text-ink sm:text-3xl">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
        {label}
      </div>
    </div>
  );
}

function uniqueTagCount(clubs: Club[]) {
  return new Set(clubs.flatMap((club) => club.tags)).size;
}
