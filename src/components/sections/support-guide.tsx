"use client";

import * as React from "react";
import {
  BookOpen,
  Briefcase,
  DoorOpen,
  ShieldAlert,
  ArrowRight,
  Check,
  type LucideIcon,
} from "lucide-react";
import { gsap, prefersSimpleTextMotion, SplitText, useGSAP } from "@/lib/gsap";
import { GrievanceForm } from "@/components/sections/grievance-form";
import { cn } from "@/lib/utils";
import type { SupportChannel } from "@/lib/schemas";

const ICONS: Record<string, LucideIcon> = {
  DoorOpen,
  BookOpen,
  Briefcase,
  ShieldAlert,
};

export function SupportGuide({ channels }: { channels: SupportChannel[] }) {
  const root = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const simpleText = prefersSimpleTextMotion();
      if (reduced) return;
      const ctx = gsap.context(() => {
        // SplitText section titles
        root.current?.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
          gsap.set(el, { opacity: 1 });
          if (simpleText) {
            gsap.from(el, {
              opacity: 0,
              y: 24,
              duration: 0.7,
              ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 85%", once: true },
            });
            return;
          }
          const split = new SplitText(el, { type: "chars,words", charsClass: "char" });
          gsap.set(split.chars, {
            opacity: 0,
            y: 60,
            rotateX: -60,
            filter: "blur(8px)",
          });
          gsap.to(split.chars, {
            opacity: 1,
            y: 0,
            rotateX: 0,
            filter: "blur(0px)",
            duration: 0.9,
            ease: "expo.out",
            stagger: { each: 0.025, from: "start" },
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
        });

        // Channel sections rising in
        root.current?.querySelectorAll<HTMLElement>("[data-channel]").forEach((sec) => {
          const big = sec.querySelector<HTMLElement>("[data-channel-watermark]");
          const left = sec.querySelectorAll<HTMLElement>("[data-channel-meta] > *");
          const list = sec.querySelectorAll<HTMLElement>("[data-bring-item]");
          if (big) {
            gsap.set(big, { opacity: 1 });
            gsap.from(big, {
              x: -60,
              opacity: 0,
              duration: 1.4,
              ease: "expo.out",
              scrollTrigger: { trigger: sec, start: "top 80%", once: true },
            });
          }
          if (left.length) {
            gsap.set(left, { opacity: 1 });
            gsap.from(left, {
              y: 30,
              opacity: 0,
              duration: 0.8,
              ease: "power3.out",
              stagger: 0.08,
              scrollTrigger: { trigger: sec, start: "top 80%", once: true },
            });
          }
          if (list.length) {
            gsap.set(list, { opacity: 1 });
            gsap.from(list, {
              x: -16,
              opacity: 0,
              duration: 0.6,
              ease: "power2.out",
              stagger: 0.06,
              scrollTrigger: { trigger: sec, start: "top 75%", once: true },
            });
          }
        });

        // Truth panel rows
        const truthRows = root.current?.querySelectorAll<HTMLElement>("[data-truth-row]");
        if (truthRows?.length) {
          gsap.set(truthRows, { opacity: 1 });
          gsap.from(truthRows, {
            opacity: 0,
            y: 20,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.08,
            scrollTrigger: { trigger: truthRows[0], start: "top 85%", once: true },
          });
        }
      }, root);
      return () => ctx.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      {/* ── Truth panel: what we do / don't do ── */}
      <section className="container mt-20">
        <div className="grid gap-px overflow-hidden rounded-3xl border border-line/15 bg-line/10 sm:grid-cols-2">
          <div data-truth-row className="bg-bg p-8 sm:p-10">
            <span className="kicker text-ink">What the Council does</span>
            <ul className="mt-8 space-y-4 text-sm text-muted">
              {[
                "Point you to the right office, person or process",
                "Walk you through what to prepare and what to expect",
                "Follow up if a request stalls or goes unanswered",
                "Own grievance & feedback channels directly",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ink" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div data-truth-row className="bg-bg p-8 sm:p-10">
            <span className="kicker text-muted">What we cannot do</span>
            <ul className="mt-8 space-y-4 text-sm text-muted">
              {[
                "Run a portal or ticketing system for academics, hostel or placements",
                "Override decisions taken by faculty, deans or operations",
                "Process complaints anonymously outside the grievance lane",
                "Promise turnaround times we don't control",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span
                    className="mt-1.5 h-3 w-3 shrink-0 rounded-full border border-line/40"
                    aria-hidden
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Channels — three editorial sections, no fake links ── */}
      <section className="container mt-32 sm:mt-40">
        <header className="mb-16 max-w-3xl">
          <span className="kicker">Three guided lanes</span>
          <h2 data-split className="display mt-6 text-balance text-5xl leading-[0.92] sm:text-7xl">
            Know who actually owns what.
          </h2>
          <p className="mt-8 text-pretty text-muted">
            Gateway, Bridge and Career Connect aren&apos;t systems we operate.
            They&apos;re names for the lanes through which the university already
            handles your concern. Here&apos;s what each one is for, who runs it,
            and how we can help you reach it.
          </p>
        </header>

        <div className="space-y-32 sm:space-y-44">
          {channels.map((c, i) => {
            const Icon = ICONS[c.icon] ?? DoorOpen;
            const isOdd = i % 2 === 1;
            return (
              <article
                key={c.id}
                id={c.id}
                data-channel
                className="relative grid gap-12 lg:grid-cols-12"
              >
                {/* Giant ghost name */}
                <span
                  data-channel-watermark
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute -top-16 select-none font-display italic leading-none text-ink/[0.03]",
                    "text-[clamp(5rem,22vw,10rem)] sm:text-[14rem]",
                    isOdd ? "right-0" : "-left-4",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Left meta column */}
                <div
                  data-channel-meta
                  className={cn(
                    "relative z-10 flex flex-col gap-6 lg:col-span-5",
                    isOdd && "lg:order-2",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-subtle">
                      {String(i + 1).padStart(2, "0")} / {String(channels.length).padStart(2, "0")}
                    </span>
                    <span className="h-px flex-1 bg-line/20" />
                  </div>
                  <div className="grid h-14 w-14 place-items-center rounded-2xl border border-line/15 bg-bg/60">
                    <Icon className="h-6 w-6 text-ink" aria-hidden />
                  </div>
                  <span className="kicker">{c.purpose}</span>
                  <h3
                    data-split
                    className="display text-6xl leading-none sm:text-7xl"
                  >
                    {c.name}.
                  </h3>
                  <p className="text-pretty text-muted">{c.description}</p>
                </div>

                {/* Right detail column */}
                <div
                  className={cn(
                    "relative z-10 flex flex-col gap-10 lg:col-span-7",
                    isOdd && "lg:order-1",
                  )}
                >
                  {/* Owned-by callout */}
                  <div className="rounded-2xl border border-line/15 p-6 sm:p-8">
                    <span className="kicker text-subtle">Owned by</span>
                    <p className="display mt-3 text-2xl text-ink sm:text-3xl">
                      {c.ownedBy}
                    </p>
                  </div>

                  {/* Bring-this checklist */}
                  <div>
                    <span className="kicker">Before you reach out, prepare</span>
                    <ul className="mt-6 divide-y divide-line/10 border-y border-line/10">
                      {c.bring.map((item, j) => (
                        <li
                          key={item}
                          data-bring-item
                          className="flex items-baseline gap-5 py-4"
                        >
                          <span className="font-mono text-xs text-subtle">
                            {String(j + 1).padStart(2, "0")}
                          </span>
                          <span className="text-pretty text-sm text-ink/90">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Council role note — replaces the old CTA button */}
                  <div className="flex items-start gap-4 rounded-2xl bg-ink/[0.04] p-6 sm:p-8">
                    <ArrowRight
                      className="mt-1 h-4 w-4 shrink-0 text-ink"
                      aria-hidden
                    />
                    <p className="text-pretty text-sm leading-relaxed text-ink/85">
                      <span className="font-medium text-ink">
                        How the Council helps —{" "}
                      </span>
                      {c.councilRole}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Grievance — the lane the Council DOES own ── */}
      <section
        id="grievance"
        className="container mt-32 mb-24 sm:mt-44"
      >
        <div className="mb-12 flex items-center gap-4">
          <span className="font-mono text-xs text-subtle">
            04 / {String(channels.length + 1).padStart(2, "0")}
          </span>
          <span className="h-px flex-1 max-w-32 bg-line/20" />
          <span className="kicker">Run by the Council directly</span>
        </div>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-line/15 bg-bg/60">
              <ShieldAlert className="h-6 w-6 text-ink" aria-hidden />
            </div>
            <h2
              data-split
              className="display mt-8 text-6xl leading-none sm:text-7xl"
            >
              Grievance.
            </h2>
            <p className="mt-8 max-w-md text-pretty text-muted">
              For sensitive concerns — discrimination, harassment, misconduct,
              or anything that needs the grievance committee&apos;s attention.
              This is the one channel the Council operates end-to-end. Anonymous
              submissions are accepted and treated with the same care.
            </p>
            <ul className="mt-12 space-y-4 text-sm text-muted">
              <li className="flex gap-3">
                <span className="font-mono text-subtle">01</span>
                Reviewed within 72 hours by the grievance committee.
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-subtle">02</span>
                You stay informed at every step — unless you choose to stay anonymous.
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-subtle">03</span>
                Outcome is documented and shared with you confidentially.
              </li>
            </ul>
          </div>
          <div className="lg:col-span-7">
            <GrievanceForm />
          </div>
        </div>
      </section>
    </div>
  );
}
