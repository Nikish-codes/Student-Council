"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { StaggerGroup, staggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";
import type { ClubActivity } from "@/lib/schemas";

/**
 * The "Our activities" bento on /clubs/[slug]. A 2-up grid of surface cards;
 * the first activity spans both columns so the section opens with a wide lead
 * story rather than a pair of equal tiles. Cards stagger in on scroll.
 */
export function ClubActivities({ activities }: { activities: ClubActivity[] }) {
  const showFeature = activities.length > 1;
  return (
    <StaggerGroup
      className="grid gap-4 sm:grid-cols-2"
      staggerChildren={0.08}
    >
      {activities.map((a, i) => (
        <motion.li
          key={`${a.title}-${i}`}
          variants={staggerItem}
          className={cn(
            "surface-card group/a flex flex-col gap-4 p-7 sm:p-8",
            i === 0 && showFeature && "sm:col-span-2",
          )}
        >
          <span className="font-mono text-xs text-subtle">
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3
            className={cn(
              "display text-ink",
              i === 0 && showFeature ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl",
            )}
          >
            {a.title}
          </h3>
          {a.description ? (
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-base">
              {a.description}
            </p>
          ) : null}
        </motion.li>
      ))}
    </StaggerGroup>
  );
}
