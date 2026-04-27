"use client";

import * as React from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

interface ScrambleTextProps {
  text: string;
  className?: string;
  durationMs?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}

export function ScrambleText({
  text,
  className,
  durationMs = 1100,
  as: Tag = "span",
}: ScrambleTextProps) {
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = React.useState(text);

  React.useEffect(() => {
    if (!inView || reduced) {
      setDisplay(text);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const reveal = Math.floor(t * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        if (i < reveal || text[i] === " ") {
          out += text[i];
        } else {
          out += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }
      setDisplay(out);
      if (t < 1) raf = requestAnimationFrame(loop);
      else setDisplay(text);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [inView, text, durationMs, reduced]);

  return (
    <Tag
      ref={ref as React.RefObject<HTMLHeadingElement>}
      className={cn(className)}
      aria-label={text}
    >
      <span aria-hidden>{display}</span>
    </Tag>
  );
}
