"use client";

import * as React from "react";

/**
 * Full-screen black boot overlay. Painted by SSR HTML/CSS so it covers
 * the page from the very first frame — no FOUC, no jolt. Fades out
 * after the window load event + a small grace period so GSAP has had
 * time to set initial states. Removes itself from the DOM after fade.
 */
export function BootOverlay() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [hide, setHide] = React.useState(false);
  const [remove, setRemove] = React.useState(false);

  React.useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let timeout = 0;

    const begin = () => {
      // Two RAFs guarantee at least one paint after hydration
      // (so any [data-...] FOUC guards have applied opacity:0).
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          // Small grace period so GSAP's initial gsap.set() has run.
          timeout = window.setTimeout(() => {
            setHide(true);
            // Clean up after fade transition
            window.setTimeout(() => setRemove(true), 900);
          }, 250);
        });
      });
    };

    if (document.readyState === "complete") {
      begin();
    } else {
      window.addEventListener("load", begin, { once: true });
    }

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timeout);
    };
  }, []);

  if (remove) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-boot-overlay
      data-hide={hide ? "true" : "false"}
      className="boot-overlay"
    >
      <div className="boot-overlay__inner">
        <div className="boot-overlay__mark">
          <span className="boot-overlay__mark-letter">W</span>
          <span className="boot-overlay__mark-letter">S</span>
          <span className="boot-overlay__mark-letter">C</span>
        </div>
        <div className="boot-overlay__bar">
          <div className="boot-overlay__bar-fill" />
        </div>
        <div className="boot-overlay__caption">
          <span>Woxsen Student Council</span>
          <span>Loading session 2026/27</span>
        </div>
      </div>
    </div>
  );
}
