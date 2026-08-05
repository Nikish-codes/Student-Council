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
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import { accentChannels } from "@/lib/club-accent";
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

  // Falls back to the site accent when unset or malformed — see lib/club-accent.
  const accent = accentChannels(club.accentColor) ?? "var(--accent)";
  const coverRatio = bannerRatio(club.coverWidth, club.coverHeight);
  const nextEvent = upcoming[0];
  const totalEvents = upcoming.length + past.length;

  return (
    <article
      className="pt-24 sm:pt-32"
      style={{ "--club-accent": accent } as React.CSSProperties}
    >
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
      <header className="container mt-12">
        <Reveal>
          <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:gap-12">
            {/* Logo sits in an accent-tinted well so every club's mark reads
                against the dark surface regardless of its own colours. */}
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl border border-line/15 bg-[rgb(var(--club-accent)/0.08)] p-5 sm:h-36 sm:w-36">
              <Picture
                src={club.logo}
                alt={`${club.name} logo`}
                fallbackLabel={initials(club.name)}
                className="h-full w-full object-contain"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="display text-balance text-5xl leading-[0.92] sm:text-7xl lg:text-8xl">
                {club.name}
              </h1>
              {club.tagline ? (
                <p className="mt-5 font-display text-2xl italic leading-tight text-[rgb(var(--club-accent))] sm:text-4xl">
                  {club.tagline}
                </p>
              ) : null}
              <p className="mt-7 max-w-2xl text-pretty text-lg text-muted">
                {club.blurb}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Stat strip — only the facts this club actually has. */}
        <Reveal delay={0.08}>
          <dl className="mt-14 flex flex-wrap items-end gap-x-14 gap-y-8 border-t border-line/10 pt-8">
            {club.members ? (
              <Stat label="Members" value={String(club.members)} />
            ) : null}
            {totalEvents > 0 ? (
              <Stat label="Events" value={String(totalEvents)} />
            ) : null}
            {club.foundedYear ? (
              <Stat label="Established" value={String(club.foundedYear)} />
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
        <div className="space-y-28 lg:col-span-8">
          {club.about ? (
            <Section number={num("about")} title="What we do">
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
            <Section number={num("activities")} title="What we run">
              {/* Hairline-separated rows, not cards — the whole page leans on
                  rules and whitespace rather than another grid of boxes. */}
              <ul className="border-t border-line/10">
                {club.activities.map((a, i) => (
                  <li
                    key={`${a.title}-${i}`}
                    className="group/a grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-b border-line/10 py-7 transition-colors hover:bg-line/[0.02] sm:gap-x-10 sm:py-9"
                  >
                    <span className="pt-1 font-mono text-[11px] text-subtle transition-colors group-hover/a:text-[rgb(var(--club-accent))]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="display text-2xl leading-tight text-ink sm:text-3xl">
                        {a.title}
                      </h3>
                      {a.description ? (
                        <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-base">
                          {a.description}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {videos.length > 0 ? (
            <Section number={num("videos")} title="Watch">
              <ClubVideos videos={videos} />
            </Section>
          ) : null}

          {upcoming.length > 0 || past.length > 0 ? (
            <Section number={num("events")} title="Events">
              <div className="space-y-12">
                {upcoming.length > 0 ? (
                  <EventList label="Coming up" events={upcoming} upcoming />
                ) : null}
                {past.length > 0 ? (
                  <EventList label="Already happened" events={past} />
                ) : null}
              </div>
            </Section>
          ) : null}

          {club.gallery.length > 0 ? (
            <Section number={num("gallery")} title="Gallery">
              {/* Offset grid: every third image runs tall, so the column edges
                  stagger instead of forming a tidy rectangle. */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {club.gallery.map((g, i) => (
                  <figure
                    key={`${g.url}-${i}`}
                    className={cn(
                      "group/g relative overflow-hidden rounded-2xl bg-surface",
                      i % 3 === 0 ? "aspect-[3/4]" : "aspect-square",
                      i % 3 === 0 && "sm:row-span-2 sm:aspect-[3/5]",
                    )}
                  >
                    <Picture
                      src={g.url}
                      alt={g.caption || `${club.name} photo ${i + 1}`}
                      fill
                      sizes="(min-width: 640px) 33vw, 50vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover/g:scale-105"
                    />
                    {g.caption ? (
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/90 to-transparent p-4 text-xs text-ink opacity-0 transition-opacity duration-500 group-hover/g:opacity-100">
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

        {/* ─── Sticky aside ─── */}
        <aside className="lg:col-span-4">
          <div className="sticky top-32 space-y-7 rounded-3xl bg-surface p-7">
            {club.categoryLabel ? (
              <div>
                <span className="kicker">Category</span>
                <p className="mt-3 text-sm text-ink">{club.categoryLabel}</p>
              </div>
            ) : null}

            {nextEvent ? (
              <div>
                <span className="kicker">Next up</span>
                <Link
                  href={`/events/${nextEvent.slug}`}
                  className="group/n mt-3 block"
                >
                  <p className="flex items-start gap-2 text-sm text-ink transition-colors group-hover/n:text-[rgb(var(--club-accent))]">
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
                  Recruitment opens at the start of each semester — watch this
                  space.
                </p>
              </div>
            )}
          </div>
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
    <Reveal as="section">
      <header className="mb-10 flex items-center gap-4">
        <span className="font-mono text-xs text-[rgb(var(--club-accent))]">
          {number}
        </span>
        <span className="h-px w-10 bg-line/20" aria-hidden />
        <h2 className="kicker">{title}</h2>
      </header>
      {children}
    </Reveal>
  );
}

function Stat({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
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
        {value}
      </dd>
    </div>
  );
}

function EventList({
  label,
  events,
  upcoming,
}: {
  label: string;
  events: EventItem[];
  upcoming?: boolean;
}) {
  return (
    <div>
      <span className="kicker text-subtle">{label}</span>
      <ul className="mt-5 border-t border-line/10">
        {events.map((e) => (
          <li key={e.slug}>
            <Link
              href={`/events/${e.slug}`}
              className="group/e flex items-center gap-5 border-b border-line/10 py-5 transition-colors hover:bg-line/[0.02]"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  upcoming ? "bg-[rgb(var(--club-accent))]" : "bg-subtle/50",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base text-ink transition-colors group-hover/e:text-[rgb(var(--club-accent))]">
                  {e.title}
                </p>
                <p className="mt-1 flex items-center gap-3 font-mono text-[11px] text-subtle">
                  <span>{formatDate(e.date)}</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {e.venue}
                  </span>
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-subtle transition-all duration-300 group-hover/e:-translate-y-0.5 group-hover/e:translate-x-0.5 group-hover/e:text-ink" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
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
        <p className="mt-1 text-sm text-[rgb(var(--club-accent))]">
          {member.role}
        </p>
        <p className="mt-1 truncate font-mono text-[11px] text-subtle">
          {member.program}
        </p>
      </div>
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
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="group/s inline-flex items-center gap-2.5 text-sm text-muted transition-colors hover:text-ink"
            >
              <l.icon className="h-3.5 w-3.5 transition-colors group-hover/s:text-[rgb(var(--club-accent))]" />
              <span className="truncate">{l.label}</span>
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
