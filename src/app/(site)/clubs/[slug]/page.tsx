import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Globe,
  Mail,
  MapPin,
} from "lucide-react";
import { Picture } from "@/components/ui/picture";
import { Button } from "@/components/ui/button";
import { InstagramMark, LinkedInMark } from "@/components/ui/brand-marks";
import { ClubVideos } from "@/components/sections/club-videos";
import { ClubActivities } from "@/components/sections/club-activities";
import { ClubSectionHeader } from "@/components/sections/club-section-header";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import { CountUp } from "@/components/motion/count-up";
import { embedSrc } from "@/lib/video";
import { getClub, getClubEvents, getClubLeads, getClubs } from "@/lib/content";
import type { ClubDetail, CouncilMember, EventItem } from "@/lib/schemas";
import { cn, formatDate, outlookCompose } from "@/lib/utils";

// ISR: the page shows upcoming-vs-past event timing, which ages.
export const revalidate = 300;

export async function generateStaticParams() {
  const clubs = await getClubs();
  return clubs.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) return { title: "Club not found" };
  const description = club.tagline || club.blurb;
  const image = club.cover || club.logo;
  return {
    title: club.name,
    description,
    openGraph: {
      title: club.name,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();

  const [{ upcoming, past }, leads] = await Promise.all([
    getClubEvents(club.id),
    getClubLeads(club.id),
  ]);

  // Resolve videos HERE rather than inside ClubVideos, so the section-presence
  // check below agrees with what actually renders. A club whose only video URL
  // is a typo would otherwise get a "Watch" heading above nothing.
  const videos = club.videos.filter((v) => embedSrc(v.url));

  /**
   * Section numbers are assigned from what this club has actually filled in,
   * not from a fixed list. A club with no videos jumps straight from 02 to 03
   * rather than leaving a hole where "03 / Watch" would have been.
   */
  const sections = [
    club.about && "about",
    club.activities.length > 0 && "activities",
    videos.length > 0 && "videos",
    (upcoming.length > 0 || past.length > 0) && "events",
    club.gallery.length > 0 && "gallery",
    leads.length > 0 && "leads",
  ].filter(Boolean) as string[];
  const num = (key: string) => {
    const i = sections.indexOf(key);
    return i < 0 ? "" : String(i + 1).padStart(2, "0");
  };

  const coverRatio = bannerRatio(club.coverWidth, club.coverHeight);
  const nextEvent = upcoming[0];
  const totalEvents = upcoming.length + past.length;

  return (
    <article className="pt-24 sm:pt-32">
      {/* ─── Breadcrumb ─── */}
      <div className="container">
        <Link
          href="/clubs"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" />
          Clubs
          {club.categoryLabel ? (
            <span className="text-subtle"> / {club.categoryLabel}</span>
          ) : null}
        </Link>
      </div>

      {/* ─── Masthead ─── */}
      {/* Club name + logo share one row: the name sits left, the large logo
          anchors the right. The name shrinks to fit beside the logo rather
          than running edge-to-edge, so the two read as a single lockup. */}
      <header className="container mt-12">
        <Reveal>
          <span className="kicker text-subtle">
            {club.categoryLabel ?? "Club"}
          </span>

          <div className="mt-6 flex items-center gap-6 sm:gap-10">
            <h1 className="display min-w-0 flex-1 text-balance text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.92]">
              {club.name}
            </h1>
            {/* Logo — large, right of the name, fills its rounded well. */}
            <div className="relative aspect-square h-32 w-32 shrink-0 overflow-hidden rounded-2xl sm:h-44 sm:w-44 sm:rounded-3xl">
              <Picture
                src={club.logo}
                alt={`${club.name} logo`}
                fallbackLabel={initials(club.name)}
                className="object-cover"
              />
            </div>
          </div>

          {club.tagline ? (
            <p className="mt-6 max-w-3xl font-display text-2xl italic leading-tight text-ink/70 sm:text-4xl">
              {club.tagline}
            </p>
          ) : null}

          <p className="mt-8 max-w-2xl text-pretty text-lg text-muted">
            {club.blurb}
          </p>
        </Reveal>

        {/* Stat strip — only the facts this club actually has. Numbers count
            up on scroll; the wide flagship string stays static. */}
        <Reveal delay={0.08}>
          <dl className="mt-16 flex flex-wrap items-end gap-x-14 gap-y-8 border-t border-line/10 pt-8">
            {club.members ? (
              <Stat label="Members" count={club.members} />
            ) : null}
            {totalEvents > 0 ? (
              <Stat label="Events" count={totalEvents} />
            ) : null}
            {club.foundedYear ? (
              <Stat label="Established" count={club.foundedYear} />
            ) : null}
            {club.flagshipEvent ? (
              <Stat label="Flagship" value={club.flagshipEvent} wide />
            ) : null}
          </dl>
        </Reveal>
      </header>

      {/* ─── Cover ─── */}
      {/* Framed at the image's OWN ratio, not a fixed viewport height. A club
          uploading a 4:1 banner used to get it crushed into a ~2.3:1 box and
          zoom-cropped; now the band is whatever shape was uploaded. The clamp
          only catches genuinely unusable shapes (a square or a portrait), which
          fall back to a cropped 3:2 rather than turning the banner into a wall. */}
      {club.cover ? (
        <div className="container mt-20 sm:mt-28">
          <div
            className="relative w-full overflow-hidden rounded-2xl border border-line/[0.08] bg-surface-2"
            style={{ aspectRatio: String(coverRatio) }}
          >
            <Picture
              src={club.cover}
              alt={`${club.name} cover`}
              fill
              // Explicit, because Picture's default is tuned for grid cards
              // ((min-width:1280px) 320px) — a full-bleed banner served at 320px
              // is the blurry-upscale bug this replaces.
              sizes="(min-width: 1536px) 1536px, 100vw"
              quality={88}
              className="object-cover"
            />
          </div>
        </div>
      ) : null}

      {/* ─── Body ─── */}
      <div className="container mt-24 grid gap-16 sm:mt-32 lg:grid-cols-12 lg:gap-20">
        <div className="space-y-32 lg:col-span-8">
          {club.about ? (
            <Section number={num("about")} title="About us">
              {/* Blank-line-separated paragraphs; authored as plain text in the
                  panel, so there is no markdown pipeline to trust here. */}
              <div className="space-y-6">
                {club.about
                  .split(/\n{2,}/)
                  .map((p) => p.trim())
                  .filter(Boolean)
                  .map((p, i) => (
                    <p
                      key={i}
                      className="text-pretty text-lg leading-relaxed text-ink/90 sm:text-xl"
                    >
                      {p}
                    </p>
                  ))}
              </div>
            </Section>
          ) : null}

          {club.activities.length > 0 ? (
            <Section number={num("activities")} title="Our activities">
              <ClubActivities activities={club.activities} />
            </Section>
          ) : null}

          {videos.length > 0 ? (
            <Section number={num("videos")} title="Watch">
              <ClubVideos videos={videos} />
            </Section>
          ) : null}

          {upcoming.length > 0 || past.length > 0 ? (
            <Section number={num("events")} title="Events">
              <EventTimeline upcoming={upcoming} past={past} />
            </Section>
          ) : null}

          {club.gallery.length > 0 ? (
            <Section number={num("gallery")} title="Gallery">
              <div className="flex flex-wrap items-start gap-3 sm:gap-4">
                {club.gallery.map((g, i) => (
                  <figure
                    key={`${g.url}-${i}`}
                    className={cn(
                      "group/g relative self-start overflow-hidden rounded-2xl bg-surface",
                      i === 0 && "w-full",
                      i > 0 &&
                        g.size === "small" &&
                        "w-[calc(50%_-_0.375rem)] sm:w-[calc(33.333%_-_0.667rem)]",
                      i > 0 &&
                        (!g.size || g.size === "medium") &&
                        "w-full sm:w-[calc(50%_-_0.5rem)]",
                      i > 0 && g.size === "large" && "w-full",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- gallery URLs can include legacy external sources */}
                    <img
                      src={g.url}
                      alt={g.caption || `${club.name} photo ${i + 1}`}
                      loading="lazy"
                      className="block h-auto w-full"
                    />
                    {g.caption ? (
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/95 via-bg/60 to-transparent p-4 pt-12 text-xs text-ink sm:opacity-0 sm:transition-opacity sm:duration-500 sm:group-hover/g:opacity-100 sm:group-focus-within/g:opacity-100">
                        {g.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            </Section>
          ) : null}

          {leads.length > 0 ? (
            <Section number={num("leads")} title="Who runs it">
              <div className="grid gap-5 sm:grid-cols-2">
                {leads.map((m) => (
                  <LeadCard key={m.id} member={m} />
                ))}
              </div>
            </Section>
          ) : null}
        </div>

        {/* ─── Sticky aside — the membership card ─── */}
        <aside className="lg:col-span-4">
          <MembershipCard
            club={club}
            nextEvent={nextEvent}
          />
        </aside>
      </div>

      {/* ─── Back to the wall ─── */}
      <div className="container mt-32 mb-32 border-t border-line/10 pt-12">
        <Link
          href="/clubs"
          className="group/b inline-flex items-center gap-3 font-display text-3xl italic text-muted transition-colors hover:text-ink sm:text-5xl"
        >
          <ArrowLeft className="h-6 w-6 transition-transform duration-500 group-hover/b:-translate-x-2 sm:h-8 sm:w-8" />
          All clubs
        </Link>
      </div>
    </article>
  );
}

// ─────────────────────────────── pieces ───────────────────────────────

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal as="section" y={32}>
      <ClubSectionHeader number={number} title={title} />
      {children}
    </Reveal>
  );
}

function Stat({
  label,
  value,
  count,
  wide,
}: {
  label: string;
  value?: string;
  count?: number;
  wide?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="kicker">{label}</dt>
      <dd
        className={cn(
          "display leading-none text-ink",
          wide ? "max-w-xs text-2xl sm:text-3xl" : "text-4xl sm:text-5xl",
        )}
      >
        {count !== undefined ? (
          <CountUp to={count} duration={1.6} />
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/** Vertical timeline. A single hairline runs down the left; each event is a
    node on it. Upcoming events get a filled marker, past events a hollow one
    and a faded treatment, with a "Past" divider between the two groups. */
function EventTimeline({
  upcoming,
  past,
}: {
  upcoming: EventItem[];
  past: EventItem[];
}) {
  const hasPast = past.length > 0;
  return (
    <ol className="relative ml-2 space-y-10 border-l border-line/10 pl-8">
      {upcoming.map((e) => (
        <TimelineNode key={e.slug} event={e} upcoming />
      ))}

      {hasPast ? (
        <li className="relative">
          <span
            aria-hidden
            className="absolute -left-[2.45rem] top-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle"
          >
            Past
          </span>
          <span aria-hidden className="block h-px w-full bg-line/10" />
        </li>
      ) : null}

      {past.map((e) => (
        <TimelineNode key={e.slug} event={e} />
      ))}
    </ol>
  );
}

function TimelineNode({
  event,
  upcoming,
}: {
  event: EventItem;
  upcoming?: boolean;
}) {
  return (
    <li className="group/t relative">
      {/* Marker on the rail. Filled for upcoming, hollow for past. */}
      <span
        aria-hidden
        className={cn(
          "absolute -left-[2.05rem] top-2 grid h-3 w-3 place-items-center rounded-full",
          upcoming
            ? "bg-ink"
            : "border border-line/40 bg-bg",
        )}
      >
        {!upcoming ? (
          <span className="h-1 w-1 rounded-full bg-line/30" />
        ) : null}
      </span>

      <Link href={`/events/${event.slug}`} className="block">
        <p className="flex items-center gap-3 font-mono text-[11px] text-subtle">
          <Calendar className="h-3 w-3" aria-hidden />
          {formatDate(event.date)}
          <span aria-hidden className="text-line/30">
            ·
          </span>
          <MapPin className="h-3 w-3" aria-hidden />
          {event.venue}
        </p>
        <h3
          className={cn(
            "display mt-2 text-2xl leading-tight transition-colors sm:text-3xl",
            upcoming
              ? "text-ink"
              : "text-ink/55 group-hover/t:text-ink",
          )}
        >
          {event.title}
        </h3>
        {upcoming && event.excerpt ? (
          <p className="mt-2 max-w-xl text-pretty text-sm text-muted">
            {event.excerpt}
          </p>
        ) : null}
      </Link>
    </li>
  );
}

function LeadCard({ member }: { member: CouncilMember }) {
  return (
    <div className="flex items-center gap-5 rounded-2xl bg-surface p-5">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-line/15 bg-line/5">
        <Picture
          src={member.photo}
          alt={member.name}
          fill
          sizes="80px"
          fallbackLabel={initials(member.name)}
          className="object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-base text-ink">{member.name}</p>
        <p className="mt-1 text-sm text-muted">{member.role}</p>
        <p className="mt-1 truncate font-mono text-[11px] text-subtle">
          {member.program}
        </p>
      </div>
    </div>
  );
}

/**
 * The right-rail "membership card" — a designed object rather than a CMS
 * sidebar. Compact metadata rows, a horizontal social-icon strip, and a
 * full-width join block at the foot so the CTA reads as a physical pass.
 */
function MembershipCard({
  club,
  nextEvent,
}: {
  club: ClubDetail;
  nextEvent?: EventItem;
}) {
  return (
    <div className="sticky top-32 space-y-6 rounded-3xl border border-line/10 bg-surface/60 p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <span className="kicker text-subtle">Membership</span>
        {club.foundedYear ? (
          <span className="font-mono text-[11px] text-subtle">
            EST. {club.foundedYear}
          </span>
        ) : null}
      </div>

      {club.categoryLabel ? (
        <Meta label="Category" value={club.categoryLabel} />
      ) : null}

      {nextEvent ? (
        <div>
          <span className="kicker">Next up</span>
          <Link
            href={`/events/${nextEvent.slug}`}
            className="group/n mt-3 block"
          >
            <p className="flex items-start gap-2 text-sm text-ink transition-colors group-hover/n:text-ink">
              <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
              <span>
                {nextEvent.title}
                <span className="mt-1 block font-mono text-[11px] text-subtle">
                  {formatDate(nextEvent.date)} · {nextEvent.venue}
                </span>
              </span>
            </p>
          </Link>
        </div>
      ) : null}

      {club.tags.length > 0 ? (
        <div>
          <span className="kicker">Tags</span>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {club.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-line/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <Socials club={club} />

      {club.joinUrl ? (
        <div className="border-t border-line/10 pt-6">
          <Magnetic className="block">
            <Button asChild size="lg" className="w-full">
              <a href={club.joinUrl} target="_blank" rel="noreferrer">
                Join {club.name.split(" ")[0]}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
          </Magnetic>
        </div>
      ) : (
        <div className="border-t border-line/10 pt-6">
          <p className="text-xs text-subtle">
            Recruitment opens at the start of each semester — watch this space.
          </p>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="kicker">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}

function Socials({ club }: { club: ClubDetail }) {
  const links = [
    club.instagramUrl && {
      icon: InstagramMark,
      label: "Instagram",
      href: club.instagramUrl,
    },
    club.linkedinUrl && {
      icon: LinkedInMark,
      label: "LinkedIn",
      href: club.linkedinUrl,
    },
    club.websiteUrl && { icon: Globe, label: "Website", href: club.websiteUrl },
    club.contactEmail && {
      icon: Mail,
      label: club.contactEmail,
      // Council inboxes are Office 365; outlookCompose lands in the right
      // client instead of whatever mailto: happens to be registered.
      href: outlookCompose(club.contactEmail),
    },
  ].filter(Boolean) as {
    icon: (props: { className?: string }) => React.ReactNode;
    label: string;
    href: string;
  }[];

  if (links.length === 0) return null;

  return (
    <div>
      <span className="kicker">Find us</span>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              aria-label={l.label}
              className="group/s inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
            >
              <l.icon className="h-4 w-4 transition-colors group-hover/s:text-ink" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * How tall to draw the cover band.
 *
 * Uses the upload's real ratio so nothing is cropped or distorted, but clamps
 * the extremes: a portrait or square photo used as a "banner" would otherwise
 * push the entire page below the fold, and a ratio past 5:1 becomes a letterbox
 * slit. Inside the band (3:2 through 5:1) the image renders exactly as uploaded.
 */
function bannerRatio(width?: number, height?: number): number {
  const DEFAULT = 2.4; // what the panel recommends when nothing is set
  const MIN = 1.5; // 3:2 — anything squarer gets cropped to this
  const MAX = 5; // 5:1 — wider than this is a slit, not a banner
  if (!width || !height) return DEFAULT;
  return Math.min(MAX, Math.max(MIN, width / height));
}

/** "Woxsen Debate Club" → "WDC", for logo/photo fallbacks. */
function initials(name: string): string {
  return name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 3);
}
