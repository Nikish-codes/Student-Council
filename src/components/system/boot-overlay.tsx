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
          <img
            src="/brand/sc-white.png"
            alt=""
            className="boot-overlay__crest-logo"
          />
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
