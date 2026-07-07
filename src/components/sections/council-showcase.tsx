"use client";

import * as React from "react";
import { Mail, ExternalLink } from "lucide-react";
import { gsap, prefersSimpleTextMotion, SplitText, useGSAP } from "@/lib/gsap";
import { CutoutPortrait } from "@/components/ui/cutout-portrait";
import { cn } from "@/lib/utils";
import type { CouncilMember } from "@/lib/schemas";

/**
 * Cinematic council showcase — president takeover + alternating
 * editorial slabs where members "pop out" as cutout PNGs over the
 * typography. No square photos, no card frames.
 */
export function CouncilShowcase({
  president,
  members,
}: {
  president?: CouncilMember;
  members: CouncilMember[];
}) {
  const root = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const simpleText = prefersSimpleTextMotion();

      const ctx = gsap.context(() => {
        // ── SplitText big titles ──
        root.current?.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
          gsap.set(el, { opacity: 1 });
          if (reduced) return;
          if (simpleText) {
            gsap.from(el, {
              opacity: 0,
              y: 24,
              duration: 0.7,
              ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            });
            return;
          }
          const split = new SplitText(el, { type: "chars,words", charsClass: "char" });
          gsap.set(split.chars, {
            opacity: 0,
            y: 80,
            rotateX: -70,
          });
          gsap.to(split.chars, {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 1,
            ease: "expo.out",
            stagger: { each: 0.022 },
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        // ── Member slab entries ──
        root.current?.querySelectorAll<HTMLElement>("[data-member]").forEach((slab) => {
          const portrait = slab.querySelector<HTMLElement>("[data-portrait]");
          const meta = slab.querySelectorAll<HTMLElement>("[data-meta-row] > *");
          const numeral = slab.querySelector<HTMLElement>("[data-numeral]");

          if (portrait) {
            gsap.set(portrait, { opacity: 1 });
            if (!reduced) {
              gsap.from(portrait, {
                y: 80,
                scale: 0.85,
                rotateZ: () => gsap.utils.random(-6, 6),
                opacity: 0,
                duration: 1.6,
                ease: "expo.out",
                scrollTrigger: { trigger: slab, start: "top 80%", once: true },
              });

              // Floaty idle once it lands
              gsap.to(portrait, {
                y: "+=14",
                duration: 4 + Math.random(),
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1,
                delay: 1.6,
              });
            }
          }

          if (meta.length) {
            gsap.set(meta, { opacity: 1 });
            if (!reduced) {
              gsap.from(meta, {
                y: 30,
                opacity: 0,
                duration: 0.9,
                ease: "expo.out",
                stagger: 0.08,
                scrollTrigger: { trigger: slab, start: "top 80%", once: true },
              });
            }
          }

          if (numeral && !reduced) {
            gsap.from(numeral, {
              x: -40,
              opacity: 0,
              duration: 1.2,
              ease: "expo.out",
              scrollTrigger: { trigger: slab, start: "top 85%", once: true },
            });
          }
        });

        // ── Cursor parallax on the president cutout ──
        const presPortrait = root.current?.querySelector<HTMLElement>("[data-president-portrait]");
        const presStage = root.current?.querySelector<HTMLElement>("[data-president-stage]");
        if (presPortrait && presStage && !reduced) {
          const x = gsap.quickTo(presPortrait, "x", { duration: 0.8, ease: "power3.out" });
          const y = gsap.quickTo(presPortrait, "y", { duration: 0.8, ease: "power3.out" });
          const onMove = (e: MouseEvent) => {
            const r = presStage.getBoundingClientRect();
            const cx = (e.clientX - r.left) / r.width - 0.5;
            const cy = (e.clientY - r.top) / r.height - 0.5;
            x(cx * 24);
            y(cy * 18);
          };
          presStage.addEventListener("mousemove", onMove);
          return () => presStage.removeEventListener("mousemove", onMove);
        }
      }, root);

      return () => ctx.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      {/* ───────────── President takeover ───────────── */}
      {president && (
        <section
          data-president-stage
          className="relative overflow-hidden border-b border-line/10"
        >
          {/* Gigantic ghost word behind */}
          <span
            aria-hidden
            className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-[clamp(2.5rem,14vw,5rem)] italic leading-none text-ink/[0.045] sm:-top-10 sm:left-0 sm:translate-x-0 sm:text-[clamp(10rem,22vw,28rem)] sm:text-ink/[0.035]"
          >
            President.
          </span>

          <div className="container relative grid grid-cols-1 items-end gap-10 pb-0 pt-24 sm:pt-32 lg:grid-cols-12 lg:gap-8">
            {/* Quote column */}
            <div className="relative z-10 lg:col-span-7">
              <div className="mb-8 flex items-center gap-3">
                <span className="font-mono text-xs text-subtle">01 / 08</span>
                <span className="h-px w-14 bg-line/30" aria-hidden />
                <span className="kicker">Message from the President</span>
              </div>
              <blockquote
                data-split
                className="display text-balance text-3xl leading-[1.18] text-ink sm:text-4xl lg:text-5xl"
              >
                &ldquo;{president.message}&rdquo;
              </blockquote>
              <div className="mt-12 flex flex-wrap items-end justify-between gap-6 border-t border-line/10 pt-8">
                <div>
                  <p className="display text-3xl">{president.name}</p>
                  <p className="mt-2 kicker">{president.role} · {president.program}</p>
                </div>
                <div className="flex items-center gap-3">
                  {president.email && (
                    <a
                      href={`mailto:${president.email}`}
                      aria-label={`Email ${president.name}`}
                      className="grid h-10 w-10 place-items-center rounded-full border border-line/15 transition-colors hover:border-line/40 hover:text-ink"
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                  {president.linkedin && (
                    <a
                      href={president.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${president.name} on LinkedIn`}
                      className="grid h-10 w-10 place-items-center rounded-full border border-line/15 transition-colors hover:border-line/40 hover:text-ink"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Cutout column — portrait pops out, no box */}
            <div className="relative lg:col-span-5">
              <div
                data-president-portrait
                className="relative mx-auto h-[60vh] w-full max-w-[520px] sm:h-[70vh] lg:h-[80vh]"
                style={{ willChange: "transform" }}
              >
                <CutoutPortrait
                  src={president.photo}
                  alt={president.name}
                  initials={initialsOf(president.name)}
                  shadow="hard"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────────── Member roll — alternating cutout slabs ───────────── */}
      <section className="relative">
        <div className="container py-24">
          <div className="mb-16 flex items-end justify-between gap-6">
            <div>
              <span className="kicker">The team</span>
              <h2
                data-split
                className="display mt-6 text-5xl leading-[0.92] sm:text-7xl"
                style={{ perspective: "800px" }}
              >
                Eight people. <span className="italic text-accent">One council.</span>
              </h2>
            </div>
            <span className="hidden font-mono text-xs text-subtle sm:block">
              {members.length.toString().padStart(2, "0")} / 08
            </span>
          </div>
        </div>

        <div className="group/wall">
          {members.map((m, i) => {
            const isOdd = i % 2 === 1;
            return (
              <article
                key={m.id}
                data-member
                className={cn(
                  "relative overflow-hidden border-t border-line/10 py-20 sm:py-28",
                  // Hover-dim siblings
                  "transition-opacity duration-500",
                  "hover:!opacity-100 group-hover/wall:opacity-40",
                )}
              >
                {/* Giant numeral watermark */}
                <span
                  data-numeral
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute top-8 select-none font-mono leading-none text-accent/[0.08]",
                    "text-[clamp(5rem,22vw,10rem)] sm:text-[16rem]",
                    isOdd ? "right-4 sm:right-10" : "left-4 sm:left-10",
                  )}
                >
                  {String(i + 2).padStart(2, "0")}
                </span>

                <div
                  className={cn(
                    "container relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8",
                  )}
                >
                  {/* Cutout */}
                  <div
                    className={cn(
                      "relative lg:col-span-5",
                      isOdd && "lg:order-2",
                    )}
                  >
                    <div
                      data-portrait
                      className="relative mx-auto h-[55vh] w-full max-w-[440px] sm:h-[60vh]"
                      style={{ willChange: "transform" }}
                    >
                      <CutoutPortrait
                        src={m.photo}
                        alt={m.name}
                        initials={initialsOf(m.name)}
                        shadow="soft"
                      />
                    </div>
                  </div>

                  {/* Quote + meta */}
                  <div
                    data-meta-row
                    className={cn(
                      "relative z-10 flex flex-col gap-8 lg:col-span-7",
                      isOdd && "lg:order-1",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-subtle">
                        0{i + 2} / 08
                      </span>
                      <span className="h-px w-14 bg-line/20" aria-hidden />
                      <span className="kicker">{m.role}</span>
                    </div>

                    <blockquote className="display text-balance text-3xl leading-[1.15] text-ink sm:text-4xl lg:text-5xl">
                      &ldquo;{m.quote ?? "Working for the campus, every day."}&rdquo;
                    </blockquote>

                    <div className="flex flex-wrap items-end justify-between gap-6 border-t border-line/10 pt-8">
                      <div>
                        <p className="display text-2xl text-ink sm:text-3xl">{m.name}</p>
                        <p className="mt-2 kicker">{m.program}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {m.email && (
                          <a
                            href={`mailto:${m.email}`}
                            aria-label={`Email ${m.name}`}
                            className="grid h-10 w-10 place-items-center rounded-full border border-line/15 transition-colors hover:border-line/40 hover:text-ink"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        )}
                        {m.linkedin && (
                          <a
                            href={m.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`${m.name} on LinkedIn`}
                            className="grid h-10 w-10 place-items-center rounded-full border border-line/15 transition-colors hover:border-line/40 hover:text-ink"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
