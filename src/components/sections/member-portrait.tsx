"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A council member's portrait, with the monogram fallback that stands in when
 * there is no photo — which is still the common case, so the fallback has to
 * look deliberate rather than like a broken <img>.
 *
 * Shared by the grid card and the expanded card so the two can never drift.
 */

const HATCH_ANGLES = [45, -45, 90, 20, -20];

export function MemberPortrait({
  name,
  photo,
  index = 0,
  sizes,
  priority = false,
  className,
}: {
  name: string;
  photo?: string;
  /** Varies the hatch angle so sibling monograms don't look cloned. */
  index?: number;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [errored, setErrored] = React.useState(false);
  const angle = HATCH_ANGLES[index % HATCH_ANGLES.length];

  if (!photo || errored) {
    return <Monogram name={name} angle={angle} className={className} />;
  }

  return (
    <Image
      src={photo}
      alt={name}
      fill
      sizes={sizes}
      quality={78}
      loading={priority ? "eager" : "lazy"}
      priority={priority}
      onError={() => setErrored(true)}
      className={cn("object-cover", className)}
    />
  );
}

/** Outlined initials over a diagonal hatch. */
function Monogram({
  name,
  angle,
  className,
}: {
  name: string;
  angle: number;
  className?: string;
}) {
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
      className={cn(
        "relative grid h-full w-full place-items-center bg-surface-2",
        className,
      )}
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
