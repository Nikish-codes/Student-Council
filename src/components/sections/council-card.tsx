"use client";

import * as React from "react";
import Image from "next/image";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { MemberLinks } from "@/components/sections/member-links";
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
 */

const HATCH_ANGLES = [45, -45, 90, 20, -20];

const SIZES: Record<
  CouncilCardSize,
  { pad: string; name: string; quote: string; aspect: string; gap: string }
> = {
  sm: {
    pad: "p-4",
    name: "text-base",
    quote: "text-sm leading-snug",
    aspect: "aspect-square",
    gap: "gap-2.5",
  },
  md: {
    pad: "p-5",
    name: "text-lg",
    quote: "text-base leading-snug",
    aspect: "aspect-[4/5]",
    gap: "gap-3",
  },
  lg: {
    pad: "p-6",
    name: "text-xl",
    quote: "text-lg leading-snug",
    aspect: "aspect-[4/5]",
    gap: "gap-3.5",
  },
};

export function CouncilCard({
  member,
  index,
  size = "md",
}: {
  member: CouncilMember;
  index: number;
  size?: CouncilCardSize;
}) {
  const [errored, setErrored] = React.useState(false);

  const s = SIZES[size];
  const hatch = HATCH_ANGLES[index % HATCH_ANGLES.length];
  const showPhoto = Boolean(member.photo) && !errored;

  return (
    <SpotlightCard
      as="article"
      data-council-card
      className="group/m flex h-full flex-col"
    >
      {/* ── Portrait ── */}
      <div className={cn("relative w-full overflow-hidden bg-surface-2", s.aspect)}>
        {showPhoto ? (
          <Image
            src={member.photo}
            alt={member.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            quality={78}
            loading="lazy"
            onError={() => setErrored(true)}
            className="object-cover grayscale transition-all duration-700 ease-out group-hover/m:scale-[1.04] group-hover/m:grayscale-0"
          />
        ) : (
          <Monogram name={member.name} angle={hatch} />
        )}
      </div>

      {/* ── Body ── */}
      <div className={cn("relative flex flex-1 flex-col", s.pad, s.gap)}>
        <span className="kicker text-[10px]">{member.role}</span>

        {/* Their line. Deliberately NOT clamped — a longer line grows the card
            rather than getting cut off mid-sentence; the grid rows stretch to
            match, so a row stays even. */}
        {member.quote && (
          <blockquote
            className={cn(
              "display text-pretty italic text-ink",
              s.quote,
            )}
          >
            &ldquo;{member.quote}&rdquo;
          </blockquote>
        )}

        <div className="mt-auto flex items-end gap-3 border-t border-line/10 pt-3">
          <div className="min-w-0 flex-1">
            <p className={cn("display truncate text-ink", s.name)}>
              {member.name}
            </p>
            {member.program && (
              <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-widest text-muted">
                {member.program}
              </p>
            )}
          </div>
          <MemberLinks member={member} size="sm" className="shrink-0" />
        </div>
      </div>
    </SpotlightCard>
  );
}

/**
 * Photo-less fallback: outlined initials over a diagonal hatch. Deliberately
 * typographic so a member without a headshot looks like a design choice rather
 * than a broken <img>. The hatch angle is passed in so sibling cards differ.
 */
function Monogram({ name, angle }: { name: string; angle: number }) {
  const initials = name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      role="img"
      aria-label={name}
      className="relative grid h-full w-full place-items-center bg-surface-2"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: `repeating-linear-gradient(${angle}deg, rgb(var(--line) / 0.05) 0 1px, transparent 1px 16px)`,
        }}
      />
      <span
        aria-hidden
        className="relative select-none font-display text-[clamp(2.5rem,7vw,4.5rem)] italic leading-none text-transparent transition-transform duration-700 ease-out group-hover/m:scale-[1.06]"
        style={{ WebkitTextStroke: "1px rgb(var(--line) / 0.22)" }}
      >
        {initials}
      </span>
    </div>
  );
}
