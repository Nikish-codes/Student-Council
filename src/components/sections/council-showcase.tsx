"use client";

import * as React from "react";
import { gsap, prefersSimpleTextMotion, SplitText, useGSAP } from "@/lib/gsap";
import { CouncilCard } from "@/components/sections/council-card";
import { CouncilMemberDialog } from "@/components/sections/council-member-dialog";
import { CutoutPortrait } from "@/components/ui/cutout-portrait";
import { MemberLinks } from "@/components/sections/member-links";
import { cn } from "@/lib/utils";
import type { CouncilMemberWithCoLeads, CouncilSection } from "@/lib/content";
import type { CouncilMember } from "@/lib/schemas";

/**
 * Lets a card deep in the section tree open the one shared dialog without
 * threading a callback through Section → Track → CouncilCard.
 */
const OpenMemberContext = React.createContext<
  ((m: CouncilMemberWithCoLeads) => void) | null
>(null);

/**
 * The /council page body: the president's full-width takeover, then one section
 * per council group in order — The Board (with its VP / officer sub-tiers), Core
 * Team, School Representatives, SCFC, and the club presidents as a single
 * horizontally-scrolling row.
 *
 * Sections, their nesting, their cards-per-row and card size all come from
 * mp_council_groups, so the shape of this page is editable in the panel rather
 * than hard-coded here.
 *
 * Motion budget: one staggered fade-up per grid and nothing that keeps running
 * afterwards (an earlier version floated every portrait forever).
 */

/**
 * Tailwind needs literal class names, so per-row counts map to fixed column
 * ladders rather than an interpolated `grid-cols-${n}`.
 */
const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
  6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
};

/**
 * Mobile cards need enough inline space for real names, not just a scaled-down
 * desktop tile. The viewport-relative widths show a useful peek of the next
 * card while keeping the current member readable at 320px.
 */
const HSCROLL_W: Record<string, string> = {
  sm: "w-[78vw] min-w-[240px] max-w-[270px] sm:w-[240px]",
  md: "w-[82vw] min-w-[260px] max-w-[310px] sm:w-[280px]",
  lg: "w-[86vw] min-w-[280px] max-w-[340px] sm:w-[320px]",
};

export function CouncilShowcase({
  president,
  sections,
}: {
  president?: CouncilMember;
  sections: CouncilSection[];
}) {
  const root = React.useRef<HTMLDivElement>(null);
  const [selected, setSelected] =
    React.useState<CouncilMemberWithCoLeads | null>(null);

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
          gsap.set(split.chars, { opacity: 0, y: 80, rotateX: -70 });
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

        // ── Section headings: one fade-rise each ──
        root.current?.querySelectorAll<HTMLElement>("[data-section-title]").forEach((el) => {
          gsap.set(el, { opacity: 1 });
          if (reduced) return;
          gsap.from(el, {
            opacity: 0,
            y: 28,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        // ── Each card track: ONE staggered fade-up, nothing per-card ──
        root.current?.querySelectorAll<HTMLElement>("[data-card-track]").forEach((track) => {
          const cards = track.querySelectorAll("[data-council-card]");
          if (!cards.length) return;
          gsap.set(cards, { opacity: 1 });
          if (reduced) return;
          gsap.from(cards, {
            opacity: 0,
            y: 28,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.05,
            scrollTrigger: { trigger: track, start: "top 88%", once: true },
          });
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
          <span
            aria-hidden
            className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-[clamp(2.5rem,14vw,5rem)] italic leading-none text-ink/[0.045] sm:-top-10 sm:left-0 sm:translate-x-0 sm:text-[clamp(10rem,22vw,28rem)] sm:text-ink/[0.035]"
          >
            President.
          </span>

          <div className="container relative grid grid-cols-1 items-end gap-10 pb-0 pt-24 sm:pt-32 lg:grid-cols-12 lg:gap-8">
            <div className="relative z-10 lg:col-span-7 pb-12 lg:pb-24">
              <div className="mb-8 flex items-center gap-3">
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
                {/* Same person-roles as every card, so the president's
                    attribution and a member's card read as one system. */}
                <div>
                  <p className="person-name break-normal text-3xl/[1.1] text-ink">
                    {president.name}
                  </p>
                  <p className="person-role mt-2 text-base">{president.role}</p>
                  <p className="person-meta mt-1">{president.program}</p>
                </div>
                <MemberLinks member={president} size="lg" className="gap-3" />
              </div>
            </div>

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

      {/* ───────────── Grouped sections ───────────── */}
      <OpenMemberContext.Provider value={setSelected}>
        {sections.map((section) => (
          <Section key={section.id} section={section} />
        ))}
      </OpenMemberContext.Provider>

      <CouncilMemberDialog
        member={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}

/** One top-level section: heading, its own members, then any sub-sections. */
function Section({ section }: { section: CouncilSection }) {
  // A section with nobody in it renders nothing at all — including its heading.
  // Same for an empty sub-group, so seeded-but-unfilled sections ("Core Team",
  // "SCFC") stay invisible until someone is actually assigned to them.
  const hasOwn = section.members.length > 0;
  const kids = section.children.filter((c) => c.members.length > 0);
  if (!hasOwn && kids.length === 0) return null;

  return (
    <section className="border-t border-line/10 py-20 sm:py-24">
      <div className="container">
        <div data-section-title className="mb-12">
          <span className="h-px w-14 bg-line/30 block" aria-hidden />
          <h2 className="display mt-6 text-4xl leading-[0.95] sm:text-6xl">
            {section.title}
          </h2>
          {/* max-w-xl, not 2xl: at the 17.5px root, 42rem resolves to 735px and
              ran this blurb to ~80 characters a line. */}
          {section.blurb && (
            <p className="mt-4 max-w-xl text-pretty text-muted">
              {section.blurb}
            </p>
          )}
        </div>

        {hasOwn && <Track section={section} />}

        {kids.map((child, i) => (
          <div key={child.id} className={cn((hasOwn || i > 0) && "mt-24")}>
            <div data-section-title className="mb-6 flex items-center gap-3">
              <span className="h-px w-10 bg-line/25" aria-hidden />
              <h3 className="kicker text-ink">{child.title}</h3>
            </div>
            {/* Smaller type needs a proportionally narrower box, not the same
                one — at text-sm this was running past 90 characters. */}
            {child.blurb && (
              <p className="mb-6 max-w-lg text-pretty text-sm text-muted">
                {child.blurb}
              </p>
            )}
            <Track section={child} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** A group's members, as either a wrapping grid or one scrolling row. */
function Track({ section }: { section: CouncilSection }) {
  const open = React.useContext(OpenMemberContext);
  if (section.members.length === 0) return null;

  if (section.layout === "hscroll") {
    return (
      <div
        data-card-track
        className="no-scrollbar mask-fade-x -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-0 sm:px-0"
      >
        {section.members.map((m, i) => (
          <div
            key={m.id}
            className={cn("shrink-0 snap-start", HSCROLL_W[section.cardSize])}
          >
            <CouncilCard
              member={m}
              index={i}
              size={section.cardSize}
              onOpen={open ? () => open(m) : undefined}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      data-card-track
      className={cn("grid gap-4", COLS[section.perRow] ?? COLS[4])}
    >
      {section.members.map((m, i) => (
        <CouncilCard
          key={m.id}
          member={m}
          index={i}
          size={section.cardSize}
          onOpen={open ? () => open(m) : undefined}
        />
      ))}
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
