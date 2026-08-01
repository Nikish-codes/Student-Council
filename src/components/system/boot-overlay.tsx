"use client";

import * as React from "react";

/**
 * Full-screen black boot overlay. Painted by SSR HTML/CSS so it covers the
 * page from the very first frame — no FOUC, no jolt. Center crest plus an
 * SVG `textPath` ring of the council's motto rotating around it. Fades out
 * after the window load event + a small grace period so GSAP has had time
 * to set initial states. Removes itself from the DOM after fade.
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
          // Short grace period so GSAP's initial gsap.set() has run.
          // Kept tight (~120ms) — the loader is a flourish, not a stage.
          timeout = window.setTimeout(() => {
            setHide(true);
            // Clean up after fade transition
            window.setTimeout(() => setRemove(true), 700);
          }, 120);
        });
      });
    };

    /**
     * Start dismissing as soon as this component has mounted — i.e. as soon as
     * React has hydrated, which is the only thing the overlay actually exists
     * to cover.
     *
     * It used to wait for `window.load`, which fires only after every image,
     * font and iframe on the page has finished. That made the overlay — and
     * therefore the page's Largest Contentful Paint — hostage to the heaviest
     * asset anywhere below the fold: on a throttled phone the crest was still
     * the largest painted element five seconds in. The two RAFs below already
     * guarantee a paint after hydration, which is the real requirement.
     */
    begin();

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
        <div className="boot-overlay__crest">
          <svg
            className="boot-overlay__ring"
            viewBox="0 0 200 200"
            aria-hidden="true"
          >
            <defs>
              <path
                id="boot-ring-path"
                d="M 100,100 m -92,0 a 92,92 0 1,1 184,0 a 92,92 0 1,1 -184,0"
              />
            </defs>
            <circle
              cx="100"
              cy="100"
              r="92"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.18"
              strokeDasharray="2 6"
            />
            <text
              fontSize="6"
              fill="currentColor"
              fillOpacity="0.7"
              letterSpacing="3"
            >
              <textPath href="#boot-ring-path" startOffset="0">
                WOXSEN UNIVERSITY · STUDENT COUNCIL · SESSION 2026/27 · EMPOWERING STUDENT VOICES ·
              </textPath>
            </text>
          </svg>
          {/* One masked element, both themes — see .brand-crest in globals.css.
              The parent .boot-overlay__crest already sets `color` to --ink, so
              the crest follows the theme with nothing to swap. */}
          <span aria-hidden className="boot-overlay__crest-logo brand-crest" />
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
