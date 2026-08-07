import { recapVideo } from "@/lib/recap-media";
import type { VaultStoryConfig } from "@/lib/schemas";

/**
 * The fallback vault stories shown on the homepage when no custom stories are
 * stored in the DB. Kept in sync with FALLBACK_ENTRIES in home-vault.tsx.
 * Exposed in VaultStoryConfig shape so the vault editor can pre-populate with
 * the stories that are actually displaying on the live site.
 */
export const VAULT_FALLBACK_STORIES: VaultStoryConfig[] = [
  {
    id: "infinity-26",
    kicker: "FLAGSHIP · CULTURAL FEST",
    title: "Infinity",
    year: "'26",
    line: "Three days. Twelve venues. Unstructured infinity — the council's biggest production of the year.",
    mediaKind: "video",
    mediaSrc: recapVideo("infinity-26-aftermovie.mp4"),
    posterSrc: "/recap/infinity-26-trailer.jpg",
    href: "/events",
  },
  {
    id: "halloween-25",
    kicker: "JASHN · CULTURAL",
    title: "Halloween",
    year: "'25",
    line: "When the lights dimmed and the spooky took over — costumes, chills, and pure chaos under the campus sky.",
    mediaKind: "video",
    mediaSrc: recapVideo("halloween-25-recap.mp4"),
    posterSrc: "/recap/halloween-25-a.jpg",
    href: "/events",
  },
  {
    id: "utopia-esports",
    kicker: "TECH · GAMING",
    title: "Utopia",
    year: "'26",
    line: "FC25, MK, and the gaming community in one room — the post-game glow, on tape.",
    mediaKind: "video",
    mediaSrc: recapVideo("utopia-esports.mp4"),
    posterSrc: "",
    href: "/events",
  },
  {
    id: "kathakriti",
    kicker: "LITERATURE · CULTURE",
    title: "Kathakriti",
    year: "'25",
    line: "From game stalls to verbal-olympics-level debates — the kind of energy you want every literature event to have.",
    mediaKind: "image",
    mediaSrc: "/recap/kathakriti-day1.webp",
    posterSrc: "",
    href: "/events",
  },
];
