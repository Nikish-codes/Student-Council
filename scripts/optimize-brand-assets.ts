/**
 * Generate web-sized variants of the brand assets in /public/brand.
 *
 *   npm run brand:optimize
 *
 * The source files are print-resolution masters (1563×1563 crest, 1200×556
 * wordmark) that were being served to browsers verbatim. On a phone that cost
 * ~560KB of PNG for logos that render at 120–450px — and because the boot
 * overlay waited on `window.load`, every one of those bytes sat directly in
 * front of the page's Largest Contentful Paint.
 *
 * Masters stay in the repo untouched; this only adds derived files next to
 * them. Re-run it whenever a master changes.
 */
import sharp from "sharp";
import { statSync } from "node:fs";

type Job = {
  src: string;
  out: string;
  width: number;
  /** Why this width — printed in the summary so the choice stays auditable. */
  note: string;
};

const JOBS: Job[] = [
  // The crest renders at most 320px (boot overlay) / ~300px (hero). 512 covers
  // both at 1.6×; it is only ever used as a CSS mask, so only alpha matters.
  {
    src: "public/brand/sc-white.png",
    out: "public/brand/sc-crest.webp",
    width: 512,
    note: "crest mask · displayed ≤320px",
  },
  // Footer wordmark: max-w-md = 448px, so 896 is a clean 2× for retina.
  {
    src: "public/brand/woxsen-university-white.png",
    out: "public/brand/woxsen-university-white.webp",
    width: 896,
    note: "footer wordmark · displayed ≤448px",
  },
  {
    src: "public/brand/woxsen-university-color.png",
    out: "public/brand/woxsen-university-color.webp",
    width: 896,
    note: "footer wordmark (light theme) · displayed ≤448px",
  },
  // Favicon / apple-touch. The 1563px master was being served as the favicon on
  // every single page load.
  {
    src: "public/icon.png",
    out: "public/icon-180.png",
    width: 180,
    note: "apple-touch-icon",
  },
  {
    src: "public/icon.png",
    out: "public/favicon-48.png",
    width: 48,
    note: "favicon",
  },
];

const kb = (path: string) => Math.round(statSync(path).size / 1024);

async function main() {
  let before = 0;
  let after = 0;

  for (const job of JOBS) {
    const src = kb(job.src);
    const pipeline = sharp(job.src).resize({
      width: job.width,
      withoutEnlargement: true,
    });

    if (job.out.endsWith(".webp")) {
      await pipeline.webp({ quality: 90, effort: 6 }).toFile(job.out);
    } else {
      await pipeline.png({ compressionLevel: 9, palette: true }).toFile(job.out);
    }

    const dst = kb(job.out);
    before += src;
    after += dst;
    console.log(
      `  ${job.out.padEnd(46)} ${String(src + "KB").padStart(7)} → ${String(
        dst + "KB",
      ).padStart(6)}   ${job.note}`,
    );
  }

  console.log(
    `\n  ${before}KB → ${after}KB  (${Math.round((1 - after / before) * 100)}% smaller)`,
  );
}

main().catch((err) => {
  console.error("Brand asset optimization failed:", err);
  process.exit(1);
});
