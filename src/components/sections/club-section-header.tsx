"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The section header on /clubs/[slug]. Assembles in three beats on scroll: the
 * index number slides in from the left, the hairline grows from its left edge,
 * and the title rises. Reduced-motion callers get an instant reveal.
 */
export function ClubSectionHeader({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  const reduced = useReducedMotion();

  const num: Variants = {
    hidden: { opacity: 0, x: reduced ? 0 : -16 },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: EASE },
    },
  };

  const line: Variants = {
    hidden: { scaleX: reduced ? 1 : 0 },
    show: {
      scaleX: 1,
      transition: { duration: 0.7, ease: EASE, delay: 0.1 },
    },
  };

  const titleV: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: EASE, delay: 0.15 },
    },
  };

  const vp = { once: true, margin: "-80px" } as const;

  return (
    <header className="mb-12 flex items-center gap-4">
      <motion.span
        className="font-mono text-xs text-subtle"
        variants={num}
        initial="hidden"
        whileInView="show"
        viewport={vp}
      >
        {number}
      </motion.span>
      <motion.span
        aria-hidden
        className="h-px w-10 origin-left bg-line/20"
        variants={line}
        initial="hidden"
        whileInView="show"
        viewport={vp}
      />
      <motion.h2
        className="kicker"
        variants={titleV}
        initial="hidden"
        whileInView="show"
        viewport={vp}
      >
        {title}
      </motion.h2>
    </header>
  );
}
