"use client";

/**
 * Production club-page renderers plus the temporary five-world comparison lab.
 * THESIS: One club record can become five authored identities; the lab refuses
 * the single editorial template with cosmetic color changes.
 * OWN-WORLD: Each preset owns its page-scale color, geometry, image behavior,
 * type hierarchy and content rhythm while the comparison controls stay fixed.
 * STORY: Visitors feel Distortion first, then understand its work, proof and
 * route to membership from the same real content in every preset.
 * FIRST VIEWPORT: Every world opens differently—stage, printed cover,
 * clubhouse invitation, cold-open artwork or signal panel—with Join visible.
 * FORM: Live five-world comparison, using the confirmed preset system and
 * real content; this temporary route is the visualization artifact.
 */

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Globe,
  Mail,
} from "lucide-react";
import { Picture } from "@/components/ui/picture";
import { InstagramMark, LinkedInMark } from "@/components/ui/brand-marks";
import type { ClubDetail, CouncilMember, EventItem } from "@/lib/schemas";
import { cn, formatDate, outlookCompose } from "@/lib/utils";
import { colorContrast } from "@/lib/club-page-theme";

type WorldId = "stage" | "zine" | "clubhouse" | "exhibition" | "signal";

const WORLDS: Array<{ id: WorldId; name: string; number: string }> = [
  { id: "stage", name: "The Stage", number: "01" },
  { id: "zine", name: "The Zine", number: "02" },
  { id: "clubhouse", name: "The Clubhouse", number: "03" },
  { id: "exhibition", name: "The Exhibition", number: "04" },
  { id: "signal", name: "The Signal", number: "05" },
];

export function DistortionClubLab({
  club,
  upcoming,
  past,
  leads,
}: {
  club: ClubDetail;
  upcoming: EventItem[];
  past: EventItem[];
  leads: CouncilMember[];
}) {
  const [world, setWorld] = React.useState<WorldId>("stage");
  const activeIndex = WORLDS.findIndex((item) => item.id === world);

  React.useEffect(() => {
    const fromHash = window.location.hash.replace("#", "") as WorldId;
    if (WORLDS.some((item) => item.id === fromHash)) setWorld(fromHash);
  }, []);

  function choose(next: WorldId) {
    setWorld(next);
    window.history.replaceState(null, "", `#${next}`);
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-world="${next}"]`)
        ?.scrollIntoView({ block: "nearest", inline: "center" });
    });
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  function move(direction: 1 | -1) {
    const next =
      WORLDS[(activeIndex + direction + WORLDS.length) % WORLDS.length];
    choose(next.id);
  }

  const props = { club, upcoming, past, leads };

  return (
    <div className="min-h-screen bg-black">
      <LabSwitcher
        active={world}
        choose={choose}
        previous={() => move(-1)}
        next={() => move(1)}
      />

      <div
        key={world}
        className="animate-in fade-in duration-500 motion-reduce:animate-none"
      >
        {world === "stage" ? <StageWorld {...props} /> : null}
        {world === "zine" ? <ZineWorld {...props} /> : null}
        {world === "clubhouse" ? <ClubhouseWorld {...props} /> : null}
        {world === "exhibition" ? <ExhibitionWorld {...props} /> : null}
        {world === "signal" ? <SignalWorld {...props} /> : null}
      </div>
    </div>
  );
}

function LabSwitcher({
  active,
  choose,
  previous,
  next,
}: {
  active: WorldId;
  choose: (world: WorldId) => void;
  previous: () => void;
  next: () => void;
}) {
  return (
    <nav
      aria-label="Club page concepts"
      className="fixed inset-x-3 bottom-auto top-[calc(0.75rem+env(safe-area-inset-top))] z-[80] mx-auto flex max-w-5xl items-center gap-2 rounded-2xl border border-white/15 bg-black/90 p-2 text-white shadow-[0_18px_50px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl sm:top-4"
    >
      <Link
        href="/clubs/distortion"
        aria-label="Return to current Distortion page"
        className="hidden h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs text-white/65 transition-colors hover:bg-white/10 hover:text-white md:flex"
      >
        <ArrowLeft className="h-4 w-4" /> Current page
      </Link>

      <button
        type="button"
        onClick={previous}
        aria-label="Previous concept"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="no-scrollbar flex min-w-0 flex-1 snap-x gap-1 overflow-x-auto">
        {WORLDS.map((item) => (
          <button
            key={item.id}
            data-world={item.id}
            type="button"
            aria-pressed={active === item.id}
            onClick={() => choose(item.id)}
            className={cn(
              "min-h-10 shrink-0 snap-start rounded-xl px-3 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:flex-1 sm:text-center",
              active === item.id
                ? "bg-white font-medium text-black"
                : "text-white/55 hover:bg-white/10 hover:text-white",
            )}
          >
            <span className="mr-1.5 font-mono text-[9px] opacity-60">
              {item.number}
            </span>
            {item.name}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={next}
        aria-label="Next concept"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

type WorldProps = {
  club: ClubDetail;
  upcoming: EventItem[];
  past: EventItem[];
  leads: CouncilMember[];
};

function hasClubSection(club: ClubDetail, section: string) {
  return (
    !club.pageVisibleSections ||
    club.pageVisibleSections.includes(section as never)
  );
}

function clubHeading(club: ClubDetail, section: string, fallback: string) {
  return club.pageSectionHeadings?.[section] || fallback;
}

function clubLogoImageClass(club: ClubDetail, base: string) {
  const treatment = club.pageTheme?.logoTreatment ?? "natural";
  return cn(
    base,
    treatment === "badge" && "rounded-full bg-white/95 p-3 shadow-sm",
    treatment === "monochrome" && "grayscale contrast-125",
  );
}

export function ClubPageRenderer({
  template,
  club,
  upcoming,
  past,
  leads,
  siteHeaderOffset = false,
}: WorldProps & {
  template: "stage" | "zine" | "clubhouse";
  siteHeaderOffset?: boolean;
}) {
  const visible = new Set(
    club.pageVisibleSections ?? [
      "about",
      "activities",
      "videos",
      "events",
      "gallery",
      "people",
    ],
  );
  const filteredClub: ClubDetail = {
    ...club,
    about: visible.has("about") ? club.about : undefined,
    activities: visible.has("activities") ? club.activities : [],
    videos: visible.has("videos") ? club.videos : [],
    gallery: visible.has("gallery") ? club.gallery : [],
  };
  const props = {
    club: filteredClub,
    upcoming: visible.has("events") ? upcoming : [],
    past: visible.has("events") ? past : [],
    leads: visible.has("people") ? leads : [],
  };
  const theme = club.pageTheme;
  const typography = club.pageTypography ?? "signal";
  const headingFont =
    typography === "editorial"
      ? "var(--font-display), Georgia, serif"
      : typography === "friendly"
        ? "var(--font-sans), system-ui, sans-serif"
        : "var(--font-mono), ui-monospace, monospace";
  const templateDefaults =
    template === "zine"
      ? { background: "#f1ead8", foreground: "#17130f", accent: "#d93818" }
      : template === "clubhouse"
        ? { background: "#efffd8", foreground: "#17301e", accent: "#a92f18" }
        : { background: "#0b0705", foreground: "#fff5e9", accent: "#ff5a1f" };
  const accent = theme?.accent ?? templateDefaults.accent;
  const accentInk =
    colorContrast(accent, "#000000") >= colorContrast(accent, "#ffffff")
      ? "#000000"
      : "#ffffff";
  return (
    <div
      data-club-template={template}
      data-club-type={typography}
      className={cn(
        "bg-[var(--club-background)] [&_h1]:[font-family:var(--club-heading-font)] [&_h2]:[font-family:var(--club-heading-font)] [&_h3]:[font-family:var(--club-heading-font)]",
        siteHeaderOffset && "pt-[88px] sm:pt-[96px]",
      )}
      style={
        {
          "--club-background": theme?.background ?? templateDefaults.background,
          "--club-foreground": theme?.foreground ?? templateDefaults.foreground,
          "--club-accent": accent,
          "--club-accent-ink": accentInk,
          "--club-heading-font": headingFont,
        } as React.CSSProperties
      }
    >
      {template === "stage" ? <StageWorld {...props} /> : null}
      {template === "zine" ? <ZineWorld {...props} /> : null}
      {template === "clubhouse" ? <ClubhouseWorld {...props} /> : null}
    </div>
  );
}

function StageWorld({ club, upcoming, past, leads }: WorldProps) {
  // Prefer the dedicated banner. When a club has not supplied one, the first
  // gallery item is its authored highlight and becomes the masthead fallback.
  const hero = club.cover || club.gallery[0]?.url;
  const eventsAreUpcoming = upcoming.length > 0;
  const events = (eventsAreUpcoming ? upcoming : past).slice(0, 3);

  return (
    <main
      className="bg-[#0b0705] text-[#fff5e9]"
      style={{
        backgroundColor: "var(--club-background, #0b0705)",
        color: "var(--club-foreground, #fff5e9)",
      }}
    >
      <section className="relative min-h-[92svh] overflow-hidden">
        {hero ? (
          <Picture
            src={hero}
            alt=""
            fill
            priority
            sizes="100vw"
            quality={90}
            className="object-contain object-[center_28%] opacity-65 saturate-125 sm:object-center"
          />
        ) : (
          <StageFallback name={club.name} />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,7,5,.18),rgba(11,7,5,.25)_45%,rgba(11,7,5,.96))]" />
        <div className="relative z-10 flex min-h-[92svh] flex-col justify-between px-5 pb-16 pt-24 sm:px-10 lg:px-16">
          <div className="flex items-start justify-between gap-6">
            <p className="max-w-xs text-xs font-medium uppercase tracking-[0.24em] text-[var(--club-accent)]">
              {club.categoryLabel || club.tags.join(" · ")}
            </p>
            <LogoSticker club={club} className="rotate-3" />
          </div>

          <div className="max-w-5xl">
            <h1 className="max-w-4xl break-words font-sans text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.03em]">
              {club.name}
            </h1>
            {club.tagline ? (
              <p className="mt-5 max-w-[60ch] text-pretty text-lg font-medium leading-[1.4] text-[#ffe5d6] sm:text-xl">
                {club.tagline}
              </p>
            ) : null}
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <JoinLink
                club={club}
                label="Join the club"
                className="bg-[var(--club-accent)] text-[var(--club-accent-ink)] hover:brightness-110"
              />
              <a
                href="#stage-story"
                className="inline-flex min-h-12 items-center gap-2 border border-white/25 px-5 text-sm font-medium text-white transition-colors hover:border-white/60"
              >
                Enter the story <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <StageSocialRail club={club} />
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y border-black/20 bg-[var(--club-accent)] py-3 text-[var(--club-accent-ink)]">
        <p className="whitespace-nowrap text-center text-xs font-black uppercase tracking-[0.28em] sm:text-sm">
          {club.tags.join(" / ")} / {club.flagshipEvent || club.name} /{" "}
          {club.tags.join(" / ")}
        </p>
      </div>

      {hasClubSection(club, "about") ? (
        <section
          id="stage-story"
          className="grid gap-12 px-5 py-20 sm:px-10 lg:grid-cols-12 lg:px-16 lg:py-24"
        >
          <div className="lg:col-span-7">
            <StageLabel>
              {clubHeading(club, "about", "Why we exist")}
            </StageLabel>
            <p className="mt-6 max-w-[65ch] whitespace-pre-line text-pretty text-lg font-medium leading-[1.65] sm:text-xl">
              {club.about || club.blurb}
            </p>
          </div>
          <dl
            className="grid grid-cols-2 gap-px self-start lg:col-span-5"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--club-accent) 25%, transparent)",
            }}
          >
            <StageStat label="Members" value={club.members} />
            <StageStat label="Established" value={club.foundedYear} />
            <StageStat label="Events" value={upcoming.length + past.length} />
            <StageStat label="Activities" value={club.activities.length} />
          </dl>
        </section>
      ) : null}

      {club.activities.length > 0 ? (
        <section className="border-t border-white/10 px-5 py-20 sm:px-10 lg:px-16 lg:py-24">
          <StageLabel>
            {clubHeading(club, "activities", "What happens here")}
          </StageLabel>
          <ol className="mt-10 divide-y divide-white/12">
            {club.activities.map((activity, index) => (
              <li
                key={`${activity.title}-${index}`}
                className="grid gap-3 py-8 sm:grid-cols-[5rem_1fr_1fr] sm:items-baseline"
              >
                <span className="font-mono text-xs text-[var(--club-accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="break-words text-xl font-bold leading-tight sm:text-2xl">
                  {activity.title}
                </h2>
                <p className="max-w-[65ch] text-base leading-[1.65] text-[#d4b8a8]">
                  {activity.description}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <StagePeople club={club} leads={leads} />
      <StageGallery club={club} />
      <StageEvents club={club} events={events} upcoming={eventsAreUpcoming} />
      <StageClose club={club} />
    </main>
  );
}

function ZineWorld({ club, upcoming, past, leads }: WorldProps) {
  const hero = club.cover || club.gallery[0]?.url;
  const eventsAreUpcoming = upcoming.length > 0;
  const events = (eventsAreUpcoming ? upcoming : past).slice(0, 3);

  return (
    <main
      className="overflow-hidden bg-[#f1ead8] text-[#17130f]"
      style={{
        backgroundColor: "var(--club-background, #f1ead8)",
        color: "var(--club-foreground, #17130f)",
      }}
    >
      <section className="relative min-h-[900px] border-b-2 border-[#17130f] px-5 pb-24 pt-28 sm:px-10 lg:px-16">
        <div className="absolute -right-28 top-40 rotate-[8deg] bg-[var(--club-accent)] px-40 py-3 text-lg font-black uppercase tracking-[0.18em] text-[var(--club-accent-ink)]">
          Campus volume / Campus volume
        </div>

        <div className="relative z-10 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="font-mono text-xs uppercase tracking-[0.24em]">
              Issue 01 · {club.categoryLabel || "Club identity"}
            </p>
            <h1 className="mt-12 max-w-4xl font-sans text-[clamp(3.5rem,10vw,6rem)] font-black uppercase leading-[0.82] tracking-[-0.04em]">
              {club.name}
            </h1>
            {club.tagline ? (
              <p className="mt-8 max-w-2xl border-y-2 border-[#17130f] py-5 font-display text-2xl italic leading-tight sm:text-4xl">
                {club.tagline}
              </p>
            ) : null}
            <p className="mt-8 max-w-xl text-lg font-medium leading-relaxed">
              {club.blurb}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <JoinLink
                club={club}
                label="Get involved"
                className="border-2 border-[#17130f] bg-[var(--club-accent)] text-[var(--club-accent-ink)] shadow-[6px_6px_0_#17130f] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              />
            </div>
          </div>

          <div className="relative min-h-[430px] lg:col-span-5 lg:mt-20">
            {hero ? (
              <div className="absolute inset-4 -rotate-3 border-2 border-[#17130f] bg-white p-3 shadow-[12px_12px_0_#17130f]">
                <div className="relative h-full min-h-[400px] overflow-hidden grayscale">
                  <Picture
                    src={hero}
                    alt=""
                    fill
                    sizes="50vw"
                    className="object-contain"
                  />
                </div>
                <p className="pt-3 font-mono text-[10px] uppercase tracking-widest">
                  {club.name} archive / Woxsen
                </p>
              </div>
            ) : (
              <div className="absolute inset-8 -rotate-3 border-2 border-[#17130f] bg-[var(--club-accent)] p-8 shadow-[12px_12px_0_#17130f]">
                <Picture
                  src={club.logo}
                  alt={`${club.name} logo`}
                  width={500}
                  height={500}
                  className={clubLogoImageClass(club, "h-full object-contain")}
                />
              </div>
            )}
            <LogoSticker
              club={club}
              className="absolute -bottom-7 -left-6 -rotate-6 border-2 border-[#17130f] shadow-[6px_6px_0_#17130f]"
            />
          </div>
        </div>
      </section>

      {hasClubSection(club, "about") ? (
        <section className="grid border-b-2 border-[#17130f] lg:grid-cols-12">
          <div className="border-b-2 border-[#17130f] p-6 sm:p-10 lg:col-span-8 lg:border-b-0 lg:border-r-2">
            <p className="font-mono text-xs uppercase tracking-[0.2em]">
              {clubHeading(club, "about", "Manifesto")}
            </p>
            <p className="mt-8 max-w-4xl text-pretty font-display text-3xl leading-tight sm:text-5xl">
              {club.about || club.blurb}
            </p>
          </div>
          <div className="grid grid-cols-2 lg:col-span-4">
            <ZineFact label="Members" value={club.members} />
            <ZineFact label="Since" value={club.foundedYear} />
            <ZineFact label="Events" value={upcoming.length + past.length} />
            <ZineFact label="People" value={leads.length} />
          </div>
        </section>
      ) : null}

      {club.activities.length > 0 ? (
        <section className="border-b-2 border-[#17130f] px-5 py-20 sm:px-10 lg:px-16">
          <div className="flex items-end justify-between gap-6">
            <h2 className="font-sans text-4xl font-black uppercase sm:text-6xl">
              {clubHeading(club, "activities", "Inside the club")}
            </h2>
            <span className="hidden font-mono text-xs sm:block">
              CUT / KEEP / PLAY
            </span>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {club.activities.map((activity, index) => (
              <article
                key={`${activity.title}-${index}`}
                className={cn(
                  "border-2 border-[#17130f] p-6",
                  index % 3 === 0 && "bg-[var(--club-accent)]",
                  index % 3 === 1 && "bg-[#c8b6ff]",
                  index % 3 === 2 && "bg-[#f9dd5e]",
                )}
              >
                <span className="font-mono text-xs">{index + 1}</span>
                <h3 className="mt-10 text-2xl font-black uppercase">
                  {activity.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed">
                  {activity.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <ZineGallery club={club} />
      <ZineEvents club={club} events={events} upcoming={eventsAreUpcoming} />
      <ZineClose club={club} />
    </main>
  );
}

function ClubhouseWorld({ club, upcoming, past, leads }: WorldProps) {
  const hero = club.cover || club.gallery[0]?.url;
  const nextEvent = upcoming[0] || past[0];
  const nextEventIsUpcoming = upcoming.length > 0;

  return (
    <main
      className="bg-[#efffd8] text-[#17301e]"
      style={{
        backgroundColor: "var(--club-background, #efffd8)",
        color: "var(--club-foreground, #17301e)",
      }}
    >
      <section className="px-5 pb-20 pt-28 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold">Woxsen clubs / {club.name}</p>
            <LogoSticker club={club} className="border-[#17301e]/20" />
          </div>

          <div className="mt-12 grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="mb-5 inline-flex rounded-full bg-[#17301e] px-4 py-2 text-xs font-semibold text-[#efffd8]">
                {club.categoryLabel || club.tags[0] || "Student club"}
              </p>
              <h1 className="font-sans text-[clamp(3.5rem,9vw,6rem)] font-bold leading-[0.9] tracking-[-0.04em]">
                A place for
                <span className="block font-display italic text-[var(--club-accent)]">
                  {club.name}.
                </span>
              </h1>
              <p className="mt-8 max-w-xl text-pretty text-xl leading-relaxed text-[#385341]">
                {club.blurb}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <JoinLink
                  club={club}
                  label={`Join ${club.name}`}
                  className="bg-[#17301e] text-[#efffd8] hover:bg-[#294b31]"
                />
                {club.instagramUrl ? (
                  <a
                    href={club.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#17301e]/25 px-5 text-sm font-semibold hover:bg-white/60"
                  >
                    <InstagramMark className="h-4 w-4" /> Follow
                  </a>
                ) : null}
              </div>
            </div>

            <div className="relative lg:col-span-6">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-[#ffdca8]">
                {hero ? (
                  <Picture
                    src={hero}
                    alt=""
                    fill
                    priority
                    sizes="50vw"
                    className="object-contain"
                  />
                ) : (
                  <Picture
                    src={club.logo}
                    alt={`${club.name} logo`}
                    fill
                    priority
                    sizes="50vw"
                    className={clubLogoImageClass(club, "object-contain p-16")}
                  />
                )}
              </div>
              {nextEvent ? (
                <Link
                  href={`/events/${nextEvent.slug}`}
                  className="absolute -bottom-7 left-5 right-5 flex items-center justify-between gap-4 rounded-2xl bg-[#ffd95c] p-5 text-[#17301e] shadow-[0_18px_40px_-24px_rgba(23,48,30,.7)] sm:left-10 sm:right-auto sm:min-w-80"
                >
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-wider">
                      {nextEventIsUpcoming ? "Next up" : "From the archive"}
                    </span>
                    <span className="mt-1 block font-semibold">
                      {nextEvent.title}
                    </span>
                  </span>
                  <ArrowUpRight className="h-5 w-5" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {hasClubSection(club, "about") ? (
        <section className="mt-8 bg-[#17301e] px-5 py-24 text-[#efffd8] sm:px-10 lg:px-16">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-sm font-semibold text-[#ffb49f]">
                {clubHeading(club, "about", "This is us")}
              </p>
              <h2 className="mt-4 max-w-lg font-display text-4xl leading-tight sm:text-6xl">
                {club.tagline || club.name}
              </h2>
            </div>
            <div className="lg:col-span-7">
              <p className="max-w-3xl text-pretty text-xl leading-relaxed text-[#c7dfca] sm:text-2xl">
                {club.about || club.blurb}
              </p>
              <dl className="mt-12 grid grid-cols-2 gap-8 border-t border-[#efffd8]/15 pt-8 sm:grid-cols-4">
                <ClubhouseFact label="Members" value={club.members} />
                <ClubhouseFact label="Since" value={club.foundedYear} />
                <ClubhouseFact
                  label="Events"
                  value={upcoming.length + past.length}
                />
                <ClubhouseFact
                  label="Activities"
                  value={club.activities.length}
                />
              </dl>
            </div>
          </div>
        </section>
      ) : null}

      {club.activities.length > 0 ? (
        <section className="px-5 py-24 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="max-w-2xl font-sans text-4xl font-bold tracking-[-0.03em] sm:text-6xl">
              {clubHeading(
                club,
                "activities",
                "What happens when we get together",
              )}
            </h2>
            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {club.activities.map((activity, index) => (
                <article
                  key={`${activity.title}-${index}`}
                  className={cn(
                    "min-h-64 rounded-3xl p-7 sm:p-9",
                    index % 3 === 0 && "bg-[#ffd95c]",
                    index % 3 === 1 && "bg-[#ffb49f]",
                    index % 3 === 2 && "bg-[#b9c7ff]",
                  )}
                >
                  <span className="text-sm font-semibold">0{index + 1}</span>
                  <h3 className="mt-14 text-3xl font-bold tracking-tight">
                    {activity.title}
                  </h3>
                  <p className="mt-3 max-w-md leading-relaxed text-[#294b31]">
                    {activity.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <ClubhousePeople club={club} leads={leads} />
      <ClubhouseGallery club={club} />
      <ClubhouseClose club={club} />
    </main>
  );
}

function ExhibitionWorld({ club, upcoming, past, leads }: WorldProps) {
  const hero = club.gallery[0]?.url || club.cover;
  const remaining = club.gallery.slice(hero === club.gallery[0]?.url ? 1 : 0);

  return (
    <main className="bg-[#f7f7f4] text-[#111]">
      <section className="relative min-h-[100svh] overflow-hidden bg-[#111] text-white">
        {hero ? (
          <Picture
            src={hero}
            alt=""
            fill
            priority
            sizes="100vw"
            quality={92}
            className="object-contain"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[#e6e6df] p-16">
            <Picture
              src={club.logo}
              alt={`${club.name} logo`}
              width={700}
              height={700}
              className="max-h-[65vh] object-contain"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.08)_55%,rgba(0,0,0,.78))]" />
        <div className="absolute inset-x-0 bottom-0 p-5 pb-16 sm:p-10 lg:p-16">
          <p className="mb-4 text-xs uppercase tracking-[0.24em] text-white/65">
            Club identity / Work 01
          </p>
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-sans text-[clamp(3.5rem,9vw,6rem)] font-medium leading-[0.88] tracking-[-0.04em]">
                {club.name}
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-white/80 sm:text-2xl">
                {club.tagline || club.blurb}
              </p>
            </div>
            <JoinLink
              club={club}
              label="Join"
              className="rounded-none bg-white text-black hover:bg-[#efefea]"
            />
          </div>
        </div>
      </section>

      <section className="grid border-b border-black/15 lg:grid-cols-12">
        <div className="border-b border-black/15 p-6 sm:p-10 lg:col-span-4 lg:border-b-0 lg:border-r">
          <p className="text-xs uppercase tracking-[0.2em]">Index</p>
          <dl className="mt-12 space-y-4 text-sm">
            <ExhibitionMeta label="Category" value={club.categoryLabel} />
            <ExhibitionMeta label="Established" value={club.foundedYear} />
            <ExhibitionMeta label="Members" value={club.members} />
            <ExhibitionMeta
              label="Events"
              value={upcoming.length + past.length}
            />
          </dl>
        </div>
        <div className="p-6 py-16 sm:p-10 lg:col-span-8 lg:p-16">
          <p className="max-w-4xl text-pretty font-display text-3xl leading-tight sm:text-5xl">
            {club.about || club.blurb}
          </p>
        </div>
      </section>

      {remaining.length > 0 ? (
        <section>
          {remaining.map((image, index) => (
            <figure
              key={`${image.url}-${index}`}
              className="grid border-b border-black/15 lg:grid-cols-12"
            >
              <div className="lg:col-span-9">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.caption || `${club.name} archive ${index + 2}`}
                  className="block h-auto w-full"
                />
              </div>
              <figcaption className="flex items-start justify-between gap-6 p-6 text-sm sm:p-10 lg:col-span-3 lg:flex-col lg:border-l lg:border-black/15">
                <span className="text-xs uppercase tracking-[0.18em]">
                  Work {String(index + 2).padStart(2, "0")}
                </span>
                <span className="max-w-xs text-black/60">
                  {image.caption || club.name}
                </span>
              </figcaption>
            </figure>
          ))}
        </section>
      ) : null}

      <ExhibitionActivities club={club} />
      <ExhibitionPeople leads={leads} />
      <ExhibitionClose club={club} />
    </main>
  );
}

function SignalWorld({ club, upcoming, past }: WorldProps) {
  const hero = club.cover || club.gallery[0]?.url;
  const eventsAreUpcoming = upcoming.length > 0;
  const events = (eventsAreUpcoming ? upcoming : past).slice(0, 3);

  return (
    <main className="bg-[#e8e7e1] text-[#121212]">
      <section className="min-h-[90svh] border-b border-black/25 px-5 pb-16 pt-28 sm:px-10 lg:px-16">
        <div className="flex items-start justify-between gap-6 border-b border-black/25 pb-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em]">
            Identity signal / {club.categoryLabel || "Woxsen club"}
          </p>
          <LogoSticker club={club} className="rounded-none border-black/20" />
        </div>

        <div className="grid gap-12 py-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.22em] text-[#da3217]">
              Transmission 001
            </p>
            <h1 className="font-sans text-[clamp(3.5rem,10vw,6rem)] font-black uppercase leading-[0.82] tracking-[-0.04em]">
              {club.name}
            </h1>
            <p className="mt-8 max-w-4xl text-pretty text-2xl font-medium leading-tight sm:text-4xl">
              {club.tagline || club.blurb}
            </p>
          </div>
          <div className="lg:col-span-4">
            <p className="max-w-md leading-relaxed text-black/65">
              {club.blurb}
            </p>
            <JoinLink
              club={club}
              label="Respond / Join"
              className="mt-7 rounded-none bg-[#da3217] text-white hover:bg-[#b92510]"
            />
          </div>
        </div>

        <dl className="grid border border-black/25 sm:grid-cols-2 lg:grid-cols-4">
          <SignalFact code="A1" label="Members" value={club.members} />
          <SignalFact code="A2" label="Established" value={club.foundedYear} />
          <SignalFact
            code="A3"
            label="Events"
            value={upcoming.length + past.length}
          />
          <SignalFact
            code="A4"
            label="Activities"
            value={club.activities.length}
          />
        </dl>
      </section>

      <section className="grid border-b border-black/25 lg:grid-cols-12">
        <div className="bg-[#da3217] p-6 text-white sm:p-10 lg:col-span-4 lg:p-14">
          <p className="font-mono text-xs uppercase tracking-[0.2em]">
            Statement
          </p>
          <p className="mt-20 font-sans text-4xl font-black uppercase leading-[0.9] sm:text-5xl">
            What the club stands for.
          </p>
        </div>
        <div className="p-6 py-16 sm:p-10 lg:col-span-8 lg:p-16">
          <p className="max-w-4xl text-pretty text-2xl font-medium leading-relaxed sm:text-4xl">
            {club.about || club.blurb}
          </p>
        </div>
      </section>

      {hero ? (
        <section className="grid border-b border-black/25 lg:grid-cols-12">
          <div className="relative min-h-[55vh] overflow-hidden lg:col-span-9">
            <Picture
              src={hero}
              alt=""
              fill
              sizes="75vw"
              className="object-contain"
            />
          </div>
          <div className="flex flex-col justify-between border-t border-black/25 p-6 sm:p-10 lg:col-span-3 lg:border-l lg:border-t-0">
            <p className="font-mono text-xs uppercase tracking-[0.2em]">
              Field image
            </p>
            <p className="mt-20 text-sm leading-relaxed text-black/60">
              {club.tagline || club.name}
            </p>
          </div>
        </section>
      ) : null}

      <SignalActivities club={club} />
      <SignalEvents events={events} upcoming={eventsAreUpcoming} />
      <SignalClose club={club} />
    </main>
  );
}

function JoinLink({
  club,
  label,
  className,
}: {
  club: ClubDetail;
  label: string;
  className?: string;
}) {
  const common = cn(
    "inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2",
    className,
  );
  return club.joinUrl ? (
    <a href={club.joinUrl} target="_blank" rel="noreferrer" className={common}>
      {label} <ArrowUpRight className="h-4 w-4" />
    </a>
  ) : (
    <span aria-disabled="true" className={cn(common, "cursor-not-allowed")}>
      Recruitment updates soon
    </span>
  );
}

type ClubSocialLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function clubSocialLinks(club: ClubDetail): ClubSocialLink[] {
  const links: ClubSocialLink[] = [];
  if (club.instagramUrl) {
    links.push({
      href: club.instagramUrl,
      label: "Instagram",
      icon: InstagramMark,
    });
  }
  if (club.linkedinUrl) {
    links.push({
      href: club.linkedinUrl,
      label: "LinkedIn",
      icon: LinkedInMark,
    });
  }
  if (club.websiteUrl) {
    links.push({ href: club.websiteUrl, label: "Website", icon: Globe });
  }
  if (club.contactEmail) {
    links.push({
      href: outlookCompose(club.contactEmail),
      label: "Email",
      icon: Mail,
    });
  }
  return links;
}

function StageSocialRail({ club }: { club: ClubDetail }) {
  const links = clubSocialLinks(club);
  if (links.length === 0) return null;

  return (
    <nav
      aria-label={`${club.name} social links`}
      className="mt-8 flex max-w-3xl flex-col gap-2 border-y border-white/20 py-3 sm:flex-row sm:items-center sm:gap-6"
    >
      <span className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--club-accent)]">
        Connect
      </span>
      <ul className="flex flex-wrap gap-x-1 gap-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="group/social inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 hover:text-[var(--club-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--club-accent)]"
            >
              <link.icon className="h-5 w-5 shrink-0" />
              {link.label}
              <ArrowUpRight className="h-3.5 w-3.5 opacity-50 transition-opacity group-hover/social:opacity-100" />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function LogoSticker({
  club,
  className,
}: {
  club: ClubDetail;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-white sm:h-24 sm:w-24",
        className,
      )}
    >
      <Picture
        src={club.logo}
        alt={`${club.name} logo`}
        fill
        priority
        sizes="96px"
        className={clubLogoImageClass(club, "object-contain p-1")}
      />
    </div>
  );
}

function StageFallback({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#160a05]" aria-hidden>
      <span className="absolute -left-10 top-1/2 -translate-y-1/2 whitespace-nowrap font-sans text-[22vw] font-black uppercase leading-none text-[var(--club-accent)] opacity-20">
        {name}
      </span>
      <span className="absolute bottom-[18%] left-[10%] h-px w-4/5 -rotate-6 bg-[var(--club-accent)] opacity-60" />
    </div>
  );
}

function StageLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--club-accent)]">
      {children}
    </p>
  );
}

function StageStat({ label, value }: { label: string; value?: number }) {
  if (value == null) return null;
  return (
    <div className="bg-[#120b08] p-5 sm:p-6">
      <dt className="text-xs uppercase tracking-[0.18em] text-[#b89583]">
        {label}
      </dt>
      <dd className="mt-3 text-3xl font-bold text-[#fff5e9]">{value}</dd>
    </div>
  );
}

function StageGallery({ club }: { club: ClubDetail }) {
  if (club.gallery.length === 0) return null;
  return (
    <section className="border-t border-white/10 px-5 py-20 sm:px-10 lg:px-16 lg:py-24">
      <StageLabel>{clubHeading(club, "gallery", "Seen and heard")}</StageLabel>
      <div className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {club.gallery.map((item, index) => (
          <figure
            key={`${item.url}-${index}`}
            className="mb-4 break-inside-avoid"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.caption || ""}
              className="h-auto w-full"
            />
            {item.caption ? (
              <figcaption className="mt-2 text-xs text-[#b89583]">
                {item.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}

function StagePeople({
  club,
  leads,
}: {
  club: ClubDetail;
  leads: CouncilMember[];
}) {
  if (leads.length === 0) return null;
  return (
    <section className="border-t border-white/10 px-5 py-20 sm:px-10 lg:px-16 lg:py-24">
      <StageLabel>{clubHeading(club, "people", "Our members")}</StageLabel>
      <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {leads.map((lead) => (
          <article key={lead.id}>
            <div className="relative aspect-square overflow-hidden bg-[#120b08]">
              <Picture
                src={lead.photo}
                alt={lead.name}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-contain object-center"
              />
            </div>
            <h3 className="mt-4 break-words text-lg font-bold leading-tight">
              {lead.name}
            </h3>
            <p className="mt-1 text-sm text-[#b89583]">{lead.role}</p>
            {lead.program ? (
              <p className="mt-1 text-xs text-[#8e7467]">{lead.program}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function StageEvents({
  club,
  events,
  upcoming,
}: {
  club: ClubDetail;
  events: EventItem[];
  upcoming: boolean;
}) {
  if (events.length === 0) return null;
  return (
    <section className="border-t border-white/10 px-5 py-20 sm:px-10 lg:px-16 lg:py-24">
      <StageLabel>
        {clubHeading(club, "events", upcoming ? "On the bill" : "Past shows")}
      </StageLabel>
      <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
        {events.map((event) => (
          <Link
            key={event.slug}
            href={`/events/${event.slug}`}
            className="grid gap-3 py-7 transition-colors hover:text-[var(--club-accent)] sm:grid-cols-[10rem_1fr_auto] sm:items-center"
          >
            <span className="font-mono text-xs text-[#b89583]">
              {formatDate(event.date)}
            </span>
            <span className="break-words text-xl font-bold leading-tight sm:text-2xl">
              {event.title}
            </span>
            <ArrowUpRight className="h-5 w-5" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function StageClose({ club }: { club: ClubDetail }) {
  return (
    <section
      className="border-t px-5 pb-24 pt-20 text-center sm:px-10 sm:pb-28 sm:pt-24"
      style={{
        borderColor: "color-mix(in srgb, var(--club-accent) 30%, transparent)",
      }}
    >
      <p className="font-sans text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold uppercase leading-[0.94] tracking-[-0.03em]">
        Find your place in the sound.
      </p>
      <JoinLink
        club={club}
        label="Join the club"
        className="mx-auto mt-10 bg-[var(--club-accent)] text-[var(--club-accent-ink)]"
      />
    </section>
  );
}

function ZineFact({ label, value }: { label: string; value?: number }) {
  if (value == null)
    return <div className="min-h-32 border-b-2 border-r-2 border-[#17130f]" />;
  return (
    <div className="border-b-2 border-r-2 border-[#17130f] p-5">
      <dt className="font-mono text-[10px] uppercase tracking-widest">
        {label}
      </dt>
      <dd className="mt-5 text-4xl font-black">{value}</dd>
    </div>
  );
}

function ZineGallery({ club }: { club: ClubDetail }) {
  if (club.gallery.length === 0) return null;
  return (
    <section className="border-b-2 border-[#17130f] p-5 py-20 sm:p-10 lg:p-16">
      <h2 className="font-sans text-4xl font-black uppercase sm:text-6xl">
        {clubHeading(club, "gallery", "The archive")}
      </h2>
      <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {club.gallery.map((item, index) => (
          <figure
            key={`${item.url}-${index}`}
            className={cn(
              "border-2 border-[#17130f] bg-white p-2 shadow-[7px_7px_0_#17130f]",
              index % 2 === 0 ? "rotate-1" : "-rotate-1",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.caption || ""}
              className="h-auto w-full"
            />
            <figcaption className="p-3 font-mono text-[10px] uppercase tracking-wider">
              {item.caption || `Archive ${String(index + 1).padStart(2, "0")}`}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function ZineEvents({
  club,
  events,
  upcoming,
}: {
  club: ClubDetail;
  events: EventItem[];
  upcoming: boolean;
}) {
  if (events.length === 0) return null;
  return (
    <section className="border-b-2 border-[#17130f] bg-[#c8b6ff] p-5 py-20 sm:p-10 lg:p-16">
      <h2 className="font-sans text-4xl font-black uppercase sm:text-6xl">
        {clubHeading(
          club,
          "events",
          upcoming ? "Dates to keep" : "From the archive",
        )}
      </h2>
      <div className="mt-10 divide-y-2 divide-[#17130f] border-y-2 border-[#17130f]">
        {events.map((event) => (
          <Link
            key={event.slug}
            href={`/events/${event.slug}`}
            className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr_auto] sm:items-center"
          >
            <span className="font-mono text-xs">{formatDate(event.date)}</span>
            <span className="text-2xl font-black uppercase">{event.title}</span>
            <ArrowUpRight className="h-5 w-5" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function ZineClose({ club }: { club: ClubDetail }) {
  return (
    <section className="bg-[var(--club-accent)] px-5 pb-36 pt-24 text-center text-[var(--club-accent-ink)] sm:px-10">
      <p className="font-sans text-[clamp(3rem,9vw,6rem)] font-black uppercase leading-[0.85] tracking-[-0.04em]">
        Make the next issue.
      </p>
      <JoinLink
        club={club}
        label="Join the club"
        className="mx-auto mt-10 border-2 border-[#17130f] bg-[#f1ead8] text-[#17130f] shadow-[6px_6px_0_#17130f]"
      />
    </section>
  );
}

function ClubhouseFact({ label, value }: { label: string; value?: number }) {
  if (value == null) return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-[#9eb8a2]">{label}</dt>
      <dd className="mt-2 text-3xl font-bold">{value}</dd>
    </div>
  );
}

function ClubhousePeople({
  club,
  leads,
}: {
  club: ClubDetail;
  leads: CouncilMember[];
}) {
  if (leads.length === 0) return null;
  return (
    <section className="bg-[#ffdca8] px-5 py-24 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-sans text-4xl font-bold tracking-tight sm:text-6xl">
          {clubHeading(club, "people", "People you’ll meet")}
        </h2>
        <div className="mt-12 flex flex-wrap gap-8">
          {leads.map((lead) => (
            <article key={lead.id} className="flex items-center gap-5">
              <div className="relative h-24 w-24 overflow-hidden rounded-full bg-white/60">
                <Picture
                  src={lead.photo}
                  alt={lead.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-xl font-bold">{lead.name}</p>
                <p className="mt-1 text-sm text-[#516456]">{lead.role}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClubhouseGallery({ club }: { club: ClubDetail }) {
  if (club.gallery.length === 0) return null;
  return (
    <section className="px-5 py-24 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-[var(--club-accent)]">
          {clubHeading(club, "gallery", "Recent moments")}
        </p>
        <div className="mt-8 flex flex-wrap items-start gap-4">
          {club.gallery.map((item, index) => (
            <figure
              key={`${item.url}-${index}`}
              className={cn(
                "overflow-hidden rounded-3xl",
                index === 0 ? "w-full" : "w-[calc(50%_-_0.5rem)]",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.caption || ""}
                className="h-auto w-full"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClubhouseClose({ club }: { club: ClubDetail }) {
  return (
    <section className="bg-[#b9c7ff] px-5 pb-36 pt-24 text-center sm:px-10">
      <p className="mx-auto max-w-4xl font-display text-[clamp(3rem,8vw,6rem)] leading-[0.9] tracking-[-0.04em]">
        There’s room for you here.
      </p>
      <JoinLink
        club={club}
        label={`Join ${club.name}`}
        className="mx-auto mt-10 bg-[#17301e] text-[#efffd8]"
      />
    </section>
  );
}

function ExhibitionMeta({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-black/15 pb-4">
      <dt className="text-black/45">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function ExhibitionActivities({ club }: { club: ClubDetail }) {
  if (club.activities.length === 0) return null;
  return (
    <section className="border-b border-black/15 p-6 py-20 sm:p-10 lg:p-16">
      <p className="text-xs uppercase tracking-[0.2em]">Programme</p>
      <div className="mt-12 divide-y divide-black/15 border-y border-black/15">
        {club.activities.map((activity, index) => (
          <article
            key={`${activity.title}-${index}`}
            className="grid gap-4 py-8 lg:grid-cols-12"
          >
            <span className="text-xs lg:col-span-1">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h2 className="text-3xl font-medium tracking-tight lg:col-span-5">
              {activity.title}
            </h2>
            <p className="max-w-2xl leading-relaxed text-black/60 lg:col-span-6">
              {activity.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExhibitionPeople({ leads }: { leads: CouncilMember[] }) {
  if (leads.length === 0) return null;
  return (
    <section className="grid border-b border-black/15 lg:grid-cols-12">
      <div className="border-b border-black/15 p-6 sm:p-10 lg:col-span-3 lg:border-b-0 lg:border-r">
        <p className="text-xs uppercase tracking-[0.2em]">Leadership</p>
      </div>
      <div className="grid gap-px bg-black/15 lg:col-span-9 sm:grid-cols-2">
        {leads.map((lead) => (
          <article
            key={lead.id}
            className="flex items-center gap-5 bg-[#f7f7f4] p-6 sm:p-10"
          >
            <div className="relative h-20 w-16 overflow-hidden bg-black/5">
              <Picture
                src={lead.photo}
                alt={lead.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-lg font-medium">{lead.name}</p>
              <p className="mt-1 text-sm text-black/50">{lead.role}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExhibitionClose({ club }: { club: ClubDetail }) {
  return (
    <section className="px-5 pb-36 pt-24 sm:px-10 lg:px-16">
      <div className="flex flex-col justify-between gap-10 border-t border-black/20 pt-10 sm:flex-row sm:items-end">
        <p className="max-w-4xl text-5xl font-medium leading-[0.9] tracking-[-0.04em] sm:text-7xl">
          Become part of the next work.
        </p>
        <JoinLink
          club={club}
          label="Join"
          className="rounded-none bg-black text-white"
        />
      </div>
    </section>
  );
}

function SignalFact({
  code,
  label,
  value,
}: {
  code: string;
  label: string;
  value?: number;
}) {
  return (
    <div className="border-b border-black/25 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="flex justify-between gap-3 font-mono text-[10px] uppercase tracking-widest text-black/55">
        {label} <span>{code}</span>
      </dt>
      <dd className="mt-7 text-4xl font-black">{value ?? "—"}</dd>
    </div>
  );
}

function SignalActivities({ club }: { club: ClubDetail }) {
  if (club.activities.length === 0) return null;
  return (
    <section className="border-b border-black/25 px-5 py-20 sm:px-10 lg:px-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em]">
        Operating modes
      </p>
      <div className="mt-10 border-t border-black/25">
        {club.activities.map((activity, index) => (
          <article
            key={`${activity.title}-${index}`}
            className="grid gap-4 border-b border-black/25 py-7 sm:grid-cols-[5rem_1fr_1fr]"
          >
            <span className="font-mono text-xs text-[#da3217]">
              OP-{index + 1}
            </span>
            <h2 className="text-2xl font-black uppercase">{activity.title}</h2>
            <p className="max-w-xl text-sm leading-relaxed text-black/60">
              {activity.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SignalEvents({
  events,
  upcoming,
}: {
  events: EventItem[];
  upcoming: boolean;
}) {
  if (events.length === 0) return null;
  return (
    <section className="grid border-b border-black/25 lg:grid-cols-12">
      <div className="bg-[#121212] p-6 text-white sm:p-10 lg:col-span-4 lg:p-14">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ff6a4f]">
          Event feed
        </p>
        <p className="mt-16 text-5xl font-black uppercase leading-[0.9]">
          {upcoming ? "What’s next." : "Past transmissions."}
        </p>
      </div>
      <div className="divide-y divide-black/25 lg:col-span-8">
        {events.map((event) => (
          <Link
            key={event.slug}
            href={`/events/${event.slug}`}
            className="grid gap-3 p-6 transition-colors hover:bg-[#d7d5cd] sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:p-10"
          >
            <span className="font-mono text-xs">{formatDate(event.date)}</span>
            <span className="text-2xl font-black uppercase">{event.title}</span>
            <ArrowUpRight className="h-5 w-5" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function SignalClose({ club }: { club: ClubDetail }) {
  return (
    <section className="px-5 pb-36 pt-24 sm:px-10 lg:px-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#da3217]">
        Open channel
      </p>
      <div className="mt-8 flex flex-col justify-between gap-10 border-t border-black/25 pt-8 sm:flex-row sm:items-end">
        <p className="max-w-4xl font-sans text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-[0.84] tracking-[-0.04em]">
          Your signal belongs here.
        </p>
        <JoinLink
          club={club}
          label="Join"
          className="shrink-0 rounded-none bg-[#da3217] text-white"
        />
      </div>
    </section>
  );
}
