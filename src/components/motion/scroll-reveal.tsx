"use client";

import * as React from "react";
import { gsap, prefersSimpleTextMotion, SplitText, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

type Effect = "rise" | "fade" | "mask" | "split-words" | "split-chars" | "split-lines";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "header" | "p" | "h1" | "h2" | "h3" | "span";
  effect?: Effect;
  delay?: number;
  duration?: number;
  stagger?: number;
  start?: string;
  once?: boolean;
  yFrom?: number;
}

/**
 * Drop-in scroll-driven reveal powered by GSAP + ScrollTrigger.
 *
 * Usage:
 *   <ScrollReveal effect="split-words"><h2>Big headline</h2></ScrollReveal>
 *   <ScrollReveal effect="rise" stagger={0.06}>{cards}</ScrollReveal> (animates direct children)
 */
export function ScrollReveal({
  as = "div",
  effect = "rise",
  delay = 0,
  duration = 0.9,
  stagger = 0.06,
  start = "top 82%",
  once = true,
  yFrom = 40,
  className,
  children,
  ...rest
}: Props) {
  const ref = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const simpleText = prefersSimpleTextMotion();
      if (reduced) {
        gsap.set(el, { opacity: 1, clearProps: "all" });
        gsap.set(el.children, { opacity: 1, y: 0, clearProps: "all" });
        return;
      }

      const ctx = gsap.context(() => {
        let split: SplitText | null = null;
        let targets: gsap.TweenTarget = el;
        let fromVars: gsap.TweenVars = { opacity: 0 };
        let toVars: gsap.TweenVars = { opacity: 1, duration, ease: "power3.out" };

        if (effect === "rise") {
          targets = el.children.length ? el.children : el;
          // Transform + opacity only. Animating filter:blur re-rasterizes each
          // target through a GPU shader every frame — cheap per element, but
          // this reveal is used site-wide, so it's removed everywhere.
          fromVars = { opacity: 0, y: yFrom };
          toVars = { opacity: 1, y: 0, duration, stagger, ease: "power3.out" };
        } else if (effect === "fade") {
          fromVars = { opacity: 0 };
          toVars = { opacity: 1, duration };
        } else if (effect === "mask") {
          fromVars = { clipPath: "inset(0 0 100% 0)", opacity: 1 };
          toVars = { clipPath: "inset(0 0 0% 0)", duration: 1.1, ease: "expo.out" };
        } else if (effect.startsWith("split-")) {
          const requestedType = effect.replace("split-", "") as "words" | "chars" | "lines";
          const type = simpleText && requestedType === "chars" ? "words" : requestedType;
          split = new SplitText(el.querySelectorAll("h1,h2,h3,h4,p,span"), {
            type: type === "lines" ? "lines,words" : type,
            linesClass: "line",
            wordsClass: "word",
            charsClass: "char",
          });
          const items =
            type === "words" ? split.words : type === "chars" ? split.chars : split.lines;
          targets = items;
          fromVars = simpleText
            ? { opacity: 0, y: 24 }
            : { opacity: 0, y: type === "chars" ? 60 : 80, rotateX: type === "chars" ? -45 : 0 };
          toVars = {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: simpleText ? 0.65 : type === "chars" ? 0.7 : 0.9,
            stagger: simpleText ? 0.04 : type === "chars" ? 0.025 : type === "words" ? 0.06 : 0.12,
            ease: "power4.out",
          };
        }

        gsap.set(targets, fromVars);
        gsap.to(targets, {
          ...toVars,
          delay,
          scrollTrigger: { trigger: el, start, once, toggleActions: "play none none reverse" },
        });

        return () => {
          split?.revert();
        };
      }, ref);

      return () => ctx.revert();
    },
    { scope: ref, dependencies: [effect, delay, duration, stagger, start, once, yFrom] },
  );

  const Tag = as as React.ElementType;
  return (
    <Tag ref={ref} className={cn(className)} {...rest}>
      {children}
    </Tag>
  );
}
