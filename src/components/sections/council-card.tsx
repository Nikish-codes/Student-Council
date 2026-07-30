"use client";

import * as React from "react";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { MemberLinks } from "@/components/sections/member-links";
import { MemberPortrait } from "@/components/sections/member-portrait";
import { cn } from "@/lib/utils";
import type { CouncilCardSize, CouncilMember } from "@/lib/schemas";

/**
 * A council member card. Sizing is driven by the group the member sits in
 * (`cardSize` on mp_council_groups), so the Board's VPs can run large at 3 per
 * row while its secretaries and treasurers run small at 4 per row.
 *
 * Everything is left-aligned. An earlier version mirrored every other card to
 * add variety, which just read as text randomly jumping to the right-hand side.
 * The section headings carry the structure now, so the cards stay consistent
 * and the only per-card variation is the hatch angle behind a missing photo.
 *
 * Passing `onOpen` makes the card expand into the full member panel. The card
 * itself can't be a <button> — it contains the Outlook/LinkedIn anchors, and
 * nesting interactive elements is invalid — so the trigger is a stretched
 * button behind the content, with the links raised above it. Co-lead cards
 * inside an already-open panel omit `onOpen` and stay static.
 */

/**
 * The name is the signature and must win: at every size it runs at least 1.4×
 * the voice, in the roman cut against the voice's italic. Previously the two
 * sat 2px apart in the same face, so a four-line quote read as the primary
 * element and the person's name read as its caption.
 */
const SIZES: Record<
  CouncilCardSize,
  { pad: string; name: string; quote: string; aspect: string; gap: string }
> = {
  sm: {
    pad: "p-4",
    name: "text-xl/[1.1]", // 21.9px vs 15.3px voice — 1.43×
    quote: "text-sm",
    aspect: "aspect-square",
    gap: "gap-2.5",
  },
  md: {
    pad: "p-5",
    name: "text-2xl/[1.1]", // 26.3px vs 17.5px — 1.50×
    quote: "text-base",
    aspect: "aspect-[4/5]",
    gap: "gap-3",
  },
  lg: {
    pad: "p-6",
    name: "text-3xl/[1.1]", // 32.8px vs 19.7px — 1.67×
    quote: "text-lg",
    aspect: "aspect-[4/5]",
    gap: "gap-3.5",
  },
};

export function CouncilCard({
  member,
  index,
  size = "md",
  onOpen,
}: {
  member: CouncilMember;
  index: number;
  size?: CouncilCardSize;
  onOpen?: () => void;
}) {
  const s = SIZES[size];

  return (
    <SpotlightCard
      as="article"
      data-council-card
      className={cn(
        "group/m flex h-full flex-col",
        onOpen && "cursor-pointer focus-within:border-line/40",
      )}
    >
      {/* Stretched trigger: covers the whole card, sits behind the links. */}
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="absolute inset-0 z-0 cursor-pointer outline-none"
        >
          <span className="sr-only">Read more about {member.name}</span>
        </button>
      )}

      {/* ── Portrait ── */}
      <div
        className={cn(
          "pointer-events-none relative w-full overflow-hidden bg-surface-2",
          s.aspect,
        )}
      >
        <MemberPortrait
          name={member.name}
          photo={member.photo}
          index={index}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="grayscale transition-all duration-700 ease-out group-hover/m:scale-[1.04] group-hover/m:grayscale-0"
        />
      </div>

      {/* ── Body ── */}
      <div
        className={cn(
          "pointer-events-none relative flex flex-1 flex-col",
          s.pad,
          s.gap,
        )}
      >
        <span className="person-role">{member.role}</span>

        {/* Their line. Deliberately NOT clamped — a longer line grows the card
            rather than getting cut off mid-sentence; the grid rows stretch to
            match, so a row stays even. */}
        {member.quote && (
          <blockquote className={cn("person-voice text-ink", s.quote)}>
            &ldquo;{member.quote}&rdquo;
          </blockquote>
        )}

        <div className="mt-auto flex flex-wrap items-end gap-3 border-t border-line/10 pt-3">
          {/* Neither the name nor the programme truncates any more. Both used
              to, and both lost real information on every phone. The minimum
              basis also moves the link buttons onto their own line before
              they can squeeze a name into a one-character-wide column. */}
          <div className="min-w-[min(100%,10rem)] flex-1">
            <p className={cn("person-name break-normal text-ink", s.name)}>
              {member.name}
            </p>
            {member.program && (
              <p className="person-meta mt-1.5">{member.program}</p>
            )}
          </div>
          {/* Raised above the stretched trigger so the links stay clickable. */}
          <MemberLinks
            member={member}
            size="sm"
            className="pointer-events-auto relative z-10 shrink-0"
          />
        </div>
      </div>
    </SpotlightCard>
  );
}
