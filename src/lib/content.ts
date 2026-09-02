import "server-only";
import { cache } from "react";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db/client";
import { normalizeAccent } from "@/lib/club-accent";
import { attachCoLeads } from "@/lib/council";
import { isEventPast } from "@/lib/event-status";
import { hostedByClubWhere } from "@/lib/event-hosts";
import {
  announcements as announcementsT,
  attendees as attendeesT,
  clubCategories as clubCategoriesT,
  clubs as clubsT,
  councilGroups as councilGroupsT,
  councilMembers as councilT,
  events as eventsT,
  eventRegistrations as regT,
  faqs as faqsT,
  highlights as highlightsT,
  media as mediaT,
  recaps as recapsT,
  sportsLeagues as sportsLeaguesT,
  sportsMatches as sportsMatchesT,
  sportsPeople as sportsPeopleT,
  sportsTeams as sportsTeamsT,
  sportsTournaments as sportsTournamentsT,
  supportChannels as supportT,
  type RegistrationStatus,
} from "@/db/schema";

import type {
  Announcement,
  Club,
  ClubCategory,
  ClubDetail,
  CouncilCardSize,
  CouncilGroup,
  CouncilGroupLayout,
  CouncilMember,
  CouncilMemberType,
  EventItem,
  FaqItem,
  Highlight,
  HomepageConfigData,
  SiteSettingsData,
  SportCompetitionStatus,
  SportDivision,
  SportMatchEvent,
  SportMatchStatus,
  SportPersonRole,
  SportPostMatch,
  SportStandingRow,
  SportType,
  SupportChannel,
  VaultStory,
  VaultStoryConfig,
} from "./schemas";

/**
 * Content getters — all read from the custom Drizzle layer (mp_* tables in
 * Turso). Each getter is wrapped in React's `cache()` so multiple server
 * components in one request share a single query. Return shapes are identical
 * to the previous Payload-backed implementation, so the public site is
 * unchanged. This file is the only seam between the data layer and the UI.
 */

// ─────────────── helpers ───────────────

function asString(v: unknown): string {
  return v == null ? "" : String(v);
}

/** Keep session copy current (mirrors the previous behaviour). */
function currentSessionCopy(v: unknown): string {
  return asString(v).replace(/2025\/26|2025-26|25\/26/g, "2026/27");
}

/** A joined media row → public URL (or ""). */
function mediaUrl(m: { url?: string | null } | null | undefined): string {
  return m?.url ?? "";
}

// ─────────────── announcements ───────────────

export const getAnnouncements = cache(async (): Promise<Announcement[]> => {
  const rows = await db
    .select()
    .from(announcementsT)
    .orderBy(desc(announcementsT.date));
  return rows
    .map((d) => ({
      id: asString(d.id),
      title: asString(d.title),
      href: d.href || undefined,
      date: asString(d.date),
      pinned: Boolean(d.pinned),
    }))
    .sort((a, b) =>
      a.pinned === b.pinned
        ? +new Date(b.date) - +new Date(a.date)
        : a.pinned
          ? -1
          : 1,
    );
});

// ─────────────── council ───────────────

const MEMBER_TYPES: CouncilMemberType[] = ["president", "member", "co_lead"];

export const getCouncil = cache(async (): Promise<CouncilMember[]> => {
  const rows = await db.query.councilMembers.findMany({
    with: { photo: true },
    orderBy: asc(councilT.sortOrder),
  });
  return rows.map((d) => ({
    id: asString(d.id),
    name: asString(d.name),
    role: asString(d.role),
    program: asString(d.program),
    photo: mediaUrl(d.photo),
    email: d.email || undefined,
    linkedin: d.linkedin || undefined,
    message: d.message || undefined,
    quote: d.quote || undefined,
    bio: d.bio || undefined,
    memberType: MEMBER_TYPES.includes(d.memberType as CouncilMemberType)
      ? (d.memberType as CouncilMemberType)
      : "member",
    groupId: d.groupId != null ? String(d.groupId) : undefined,
    clubId: d.clubId != null ? String(d.clubId) : undefined,
    isPresident: Boolean(d.isPresident),
    featured: Boolean(d.featured),
    order: typeof d.sortOrder === "number" ? d.sortOrder : 99,
  }));
});

/** People intentionally placed on the public Council page. Club-only profiles
 * stay available to their club page without inflating Council/homepage counts. */
export const getCouncilPageMembers = cache(
  async (): Promise<CouncilMember[]> => {
    const members = await getCouncil();
    return members.filter(
      (member) => member.memberType === "president" || Boolean(member.groupId),
    );
  },
);

/** A member as the page renders them: with the co-leads working under them. */
export type CouncilMemberWithCoLeads = CouncilMember & {
  coLeads: CouncilMember[];
};

/** A group plus the members in it and any sub-groups beneath it. */
export type CouncilSection = CouncilGroup & {
  members: CouncilMemberWithCoLeads[];
  children: CouncilSection[];
};

const CARD_SIZES: CouncilCardSize[] = ["sm", "md", "lg"];
const LAYOUTS: CouncilGroupLayout[] = ["grid", "hscroll"];

/**
 * The /council page structure: top-level sections in order, each with its own
 * members and sub-sections (the Board's VP / officer tiers). The president is
 * excluded — they get the takeover, not a card.
 *
 * Only members assigned to a Council section appear here. Ungrouped profiles
 * may belong exclusively to an individual club page and must not leak into a
 * generic Council section.
 *
 * Co-leads are deliberately NOT placed in any section — they hang off their
 * lead (see src/lib/council.ts) and surface only in that lead's expanded card.
 */
export const getCouncilSections = cache(async (): Promise<CouncilSection[]> => {
  const [groupRows, members] = await Promise.all([
    db.query.councilGroups.findMany({ orderBy: asc(councilGroupsT.sortOrder) }),
    getCouncil(),
  ]);

  const toGroup = (g: (typeof groupRows)[number]): CouncilGroup => ({
    id: String(g.id),
    title: asString(g.title),
    blurb: g.blurb || undefined,
    parentId: g.parentId != null ? String(g.parentId) : undefined,
    perRow: Math.min(6, Math.max(1, Number(g.perRow) || 4)),
    cardSize: CARD_SIZES.includes(g.cardSize as CouncilCardSize)
      ? (g.cardSize as CouncilCardSize)
      : "md",
    layout: LAYOUTS.includes(g.layout as CouncilGroupLayout)
      ? (g.layout as CouncilGroupLayout)
      : "grid",
    order: typeof g.sortOrder === "number" ? g.sortOrder : 99,
  });

  // Built from ALL members, co-leads included, before anyone is filtered out.
  const coLeadsByLeadId = attachCoLeads(members);
  const withCoLeads = (m: CouncilMember): CouncilMemberWithCoLeads => ({
    ...m,
    coLeads: coLeadsByLeadId.get(m.id) ?? [],
  });

  const byGroup = new Map<string, CouncilMemberWithCoLeads[]>();
  for (const m of members) {
    // The president gets the full-width takeover — never a card.
    if (m.memberType === "president") continue;
    // Co-leads WITHOUT a group stay dialog-only (they hang off their lead's
    // expanded card). Co-leads WITH a groupId are placed into that group's
    // section so they render as normal cards on the page too.
    if (m.memberType === "co_lead" && !m.groupId) continue;
    const entry = withCoLeads(m);
    if (!m.groupId) continue;
    const list = byGroup.get(m.groupId);
    if (list) list.push(entry);
    else byGroup.set(m.groupId, [entry]);
  }

  const groups = groupRows.map(toGroup);
  const known = new Set(groups.map((g) => g.id));
  const build = (g: CouncilGroup): CouncilSection => ({
    ...g,
    members: byGroup.get(g.id) ?? [],
    children: groups.filter((c) => c.parentId === g.id).map(build),
  });

  const sections = groups.filter((g) => !g.parentId).map(build);

  // Anything pointing at a missing parent would otherwise never render.
  const orphaned = groups.filter((g) => g.parentId && !known.has(g.parentId));
  sections.push(...orphaned.map(build));

  return sections;
});

/**
 * The single member who gets the full-width takeover on /council. Prefers the
 * explicit `memberType`, then falls back to the older `isPresident` flag and
 * finally a role-name check, so a row that predates the `member_type` backfill
 * still resolves.
 */
export async function getPresident(): Promise<CouncilMember | undefined> {
  const all = await getCouncil();
  return (
    all.find((m) => m.memberType === "president") ??
    all.find((m) => m.isPresident) ??
    all.find((m) => /president/i.test(m.role) && !/vice/i.test(m.role))
  );
}

/**
 * The group portrait selected for the council page in the management panel.
 *
 * Returns the stored pixel dimensions alongside the URL so the page can size
 * its frame to the actual image. Without them the frame had to guess an aspect
 * ratio, and the guess (21/9) cropped roughly a third off a 3:2 photograph —
 * people at the top and bottom of the group simply disappeared.
 */
export type CouncilGroupPhoto = {
  url: string;
  width?: number;
  height?: number;
};

export const getCouncilGroupPhoto = cache(
  async (): Promise<CouncilGroupPhoto | undefined> => {
    const settings = await db.query.siteSettings.findFirst({
      columns: { id: true },
      with: {
        councilGroupPhoto: {
          columns: { url: true, width: true, height: true },
        },
      },
    });

    const photo = settings?.councilGroupPhoto;
    if (!photo?.url) return undefined;
    return {
      url: photo.url,
      width: typeof photo.width === "number" ? photo.width : undefined,
      height: typeof photo.height === "number" ? photo.height : undefined,
    };
  },
);

// ─────────────── events ───────────────

type EventRow = typeof eventsT.$inferSelect & {
  banner?: { url?: string | null } | null;
};

function mapEventRow(d: EventRow): EventItem {
  return {
    id: typeof d.id === "number" ? d.id : undefined,
    slug: asString(d.slug),
    title: asString(d.title),
    category: asString(d.category) as EventItem["category"],
    date: asString(d.date),
    endDate: d.endDate || undefined,
    venue: asString(d.venue),
    banner: mediaUrl(d.banner),
    excerpt: asString(d.excerpt),
    description: asString(d.description),
    videoUrl: d.videoUrl || undefined,
    registrationUrl: d.registrationUrl || undefined,
    attendees: typeof d.attendees === "number" ? d.attendees : undefined,
    featured: Boolean(d.featured),
    registrationEnabled: Boolean(d.registrationEnabled),
    priceInPaise: typeof d.priceInPaise === "number" ? d.priceInPaise : 0,
    capacity: typeof d.capacity === "number" ? d.capacity : undefined,
  };
}

export const getEvents = cache(async (): Promise<EventItem[]> => {
  const rows = await db.query.events.findMany({
    where: eq(eventsT.status, "published"),
    with: { banner: true },
    orderBy: asc(eventsT.date),
  });
  return rows.map(mapEventRow);
});

export const getEvent = cache(
  async (slug: string): Promise<EventItem | undefined> => {
    const row = await db.query.events.findFirst({
      where: and(eq(eventsT.status, "published"), eq(eventsT.slug, slug)),
      with: { banner: true },
    });
    return row ? mapEventRow(row) : undefined;
  },
);

export const getRelatedEvents = cache(
  async (event: EventItem, limit = 3): Promise<EventItem[]> => {
    const rows = await db.query.events.findMany({
      where: and(
        eq(eventsT.status, "published"),
        eq(eventsT.category, event.category),
        ne(eventsT.slug, event.slug),
      ),
      with: { banner: true },
      orderBy: asc(eventsT.date),
      limit,
    });
    return rows.map(mapEventRow);
  },
);

export async function getUpcomingEvents(limit = 3): Promise<EventItem[]> {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  const rows = await db.query.events.findMany({
    where: and(
      eq(eventsT.status, "published"),
      or(
        isNull(eventsT.endDate),
        gte(eventsT.date, yesterday),
        gte(eventsT.endDate, now),
      ),
    ),
    with: { banner: true },
    orderBy: asc(eventsT.date),
    limit,
  });
  return rows.map(mapEventRow);
}

export async function getPastEvents(): Promise<EventItem[]> {
  const now = Date.now();
  const all = await getEvents();
  return all.filter((e) => isEventPast(e, now)).reverse();
}

// ─────────────── clubs ───────────────

export const getClubs = cache(async (): Promise<Club[]> => {
  const rows = await db.query.clubs.findMany({
    with: { logo: true },
    orderBy: asc(clubsT.name),
  });
  return rows.map((d) => ({
    id: d.id,
    slug: asString(d.slug),
    name: asString(d.name),
    logo: mediaUrl(d.logo),
    blurb: asString(d.blurb),
    joinUrl: d.joinUrl || undefined,
    tags: Array.isArray(d.tags) ? d.tags : [],
    members: typeof d.members === "number" ? d.members : undefined,
    categoryId: d.categoryId != null ? String(d.categoryId) : undefined,
    tagline: d.tagline || undefined,
    accentColor: normalizeAccent(d.accentColor),
  }));
});

/**
 * One club with everything /clubs/[slug] renders. Every content block is
 * optional — the page derives its section numbering from what is actually
 * present, so a club that has only filled in its card still gets a clean page.
 */
export const getClub = cache(
  async (slug: string): Promise<ClubDetail | undefined> => {
    const d = await db.query.clubs.findFirst({
      where: eq(clubsT.slug, slug),
      with: { logo: true, cover: true, category: true },
    });
    if (!d) return undefined;
    return {
      id: d.id,
      slug: asString(d.slug),
      name: asString(d.name),
      logo: mediaUrl(d.logo),
      blurb: asString(d.blurb),
      joinUrl: d.joinUrl || undefined,
      tags: Array.isArray(d.tags) ? d.tags : [],
      members: typeof d.members === "number" ? d.members : undefined,
      categoryId: d.categoryId != null ? String(d.categoryId) : undefined,
      categoryLabel: d.category?.label || undefined,
      categorySlug: d.category?.slug || undefined,
      tagline: d.tagline || undefined,
      // Re-validated on read, not just on write: rows may predate the panel's
      // validation, and this string goes straight into a style attribute.
      accentColor: normalizeAccent(d.accentColor),
      about: d.about || undefined,
      cover: mediaUrl(d.cover) || undefined,
      coverWidth:
        typeof d.cover?.width === "number" ? d.cover.width : undefined,
      coverHeight:
        typeof d.cover?.height === "number" ? d.cover.height : undefined,
      foundedYear:
        typeof d.foundedYear === "number" ? d.foundedYear : undefined,
      activities: (d.activities ?? []).filter((a) => a?.title?.trim()),
      flagshipEvent: d.flagshipEvent || undefined,
      videos: (d.videos ?? []).filter((v) => v?.url?.trim()),
      gallery: (d.gallery ?? []).filter((g) => g?.url?.trim()),
      instagramUrl: d.instagramUrl || undefined,
      linkedinUrl: d.linkedinUrl || undefined,
      websiteUrl: d.websiteUrl || undefined,
      contactEmail: d.contactEmail || undefined,
      pageTemplate: d.pageTemplate || undefined,
      pageTheme: d.pageTheme || undefined,
      pageVisibleSections: d.pageVisibleSections || undefined,
      pageSectionHeadings: d.pageSectionHeadings || undefined,
      pageTypography: d.pageTypography || undefined,
    };
  },
);

/**
 * A club's own events, split by timing. Published only, and ordered so the
 * soonest upcoming event is first while past events read most-recent-first.
 */
export const getClubEvents = cache(
  async (
    clubId: number,
  ): Promise<{ upcoming: EventItem[]; past: EventItem[] }> => {
    const rows = await db.query.events.findMany({
      where: and(eq(eventsT.status, "published"), hostedByClubWhere(clubId)),
      with: { banner: true },
      orderBy: asc(eventsT.date),
    });
    const all = rows.map(mapEventRow);
    const now = Date.now();
    return {
      upcoming: all.filter((e) => !isEventPast(e, now)),
      past: all.filter((e) => isEventPast(e, now)).reverse(),
    };
  },
);

/**
 * The council members who run this club. Filters the already-cached
 * `getCouncil()` result rather than issuing a second query — on the club page
 * this is usually a cache hit and costs nothing.
 */
export const getClubLeads = cache(
  async (clubId: number): Promise<CouncilMember[]> => {
    const all = await getCouncil();
    return all.filter((m) => m.clubId === String(clubId));
  },
);

/**
 * The /clubs headings, in page order. Categories with no clubs in them are kept
 * here — the explorer drops the empty ones, but the panel needs the full list.
 */
export const getClubCategories = cache(async (): Promise<ClubCategory[]> => {
  const rows = await db
    .select()
    .from(clubCategoriesT)
    .orderBy(asc(clubCategoriesT.sortOrder), asc(clubCategoriesT.id));
  return rows.map((d) => ({
    id: String(d.id),
    slug: asString(d.slug),
    label: asString(d.label),
    blurb: d.blurb || undefined,
    order: d.sortOrder,
  }));
});

// ─────────────── support ───────────────

export const getSupportChannels = cache(async (): Promise<SupportChannel[]> => {
  const rows = await db.select().from(supportT);
  return rows.map((d) => ({
    id: asString(d.id),
    name: asString(d.name),
    purpose: asString(d.purpose),
    description: asString(d.description),
    icon: asString(d.icon),
    ownedBy: asString(d.ownedBy),
    bring: Array.isArray(d.bring) ? d.bring : [],
    councilRole: asString(d.councilRole),
  }));
});

// ─────────────── highlights ───────────────

export const getHighlights = cache(async (): Promise<Highlight[]> => {
  const rows = await db.query.highlights.findMany({
    with: { image: true },
    orderBy: asc(highlightsT.sortOrder),
  });
  return rows.map((d) => ({
    id: asString(d.id),
    src: mediaUrl(d.image),
    alt: asString(d.alt),
    caption: d.caption || undefined,
    span: (asString(d.span) || "md") as Highlight["span"],
  }));
});

// ─────────────── homepage config ───────────────

const HOMEPAGE_DEFAULTS: HomepageConfigData = {
  hero: {
    kicker: "Woxsen Student Council · Session 2026/27",
    headline: "Empowering",
    sublineLead: "student",
    sublineWords: ["voices.", "futures.", "ideas.", "stories."],
    subParagraph:
      "The official portal of the Woxsen Student Council — events, clubs, leadership, and the support channels that keep campus moving.",
    ctas: [
      { label: "Explore events", href: "/events", variant: "primary" },
      {
        label: "Raise a concern",
        href: "/support#grievance-form",
        variant: "outline",
      },
      { label: "Meet the team", href: "/council", variant: "ghost" },
    ],
    marqueeText: "Of the students. For the students. By the students.",
  },
  statsKicker: "By the numbers · 2026/27",
  stats: [
    { value: 29, label: "Student-run clubs" },
    { value: 8, label: "Schools represented" },
    { value: 200, suffix: "+", label: "Events every year" },
    { value: 5000, suffix: "+", label: "Active students", displayValue: "5K+" },
    { value: 1, label: "Council, of you" },
  ],
  manifestoKicker: "Manifesto · 2026/27",
  manifestoLines: [
    { lead: "We don't run", tail: "the desks." },
    { lead: "We open", tail: "the doors." },
    { lead: "Built by students.", tail: "Owned by students." },
    { lead: "If it matters here,", tail: "it starts here." },
  ],
  manifestoFooter: "Read in: 9 seconds",
  quickActions: [
    {
      icon: "ShieldAlert",
      title: "Submit a grievance",
      body: "Confidential channel for harassment, discrimination, or misconduct concerns.",
      href: "/support#grievance-form",
    },
    {
      icon: "Users",
      title: "Join a club",
      body: "Twelve+ active clubs across tech, design, arts, sports and entrepreneurship.",
      href: "/clubs",
    },
    {
      icon: "MessagesSquare",
      title: "Talk to the Council",
      body: "Share an idea, request a meeting, or flag something the Council should know.",
      href: "mailto:council@woxsen.edu.in",
    },
  ],
  closingCta: {
    kicker: "Get involved",
    headlineLead: "The Council is yours.",
    headlineTail: "Show up. Speak up.",
    ctas: [
      { label: "Meet the Council", href: "/council", variant: "primary" },
      { label: "Browse clubs", href: "/clubs", variant: "outline" },
    ],
  },
  flagshipEventSlug: undefined,
  featuredClubSlugs: [],
  vaultStories: [],
  tagline: "Built by students. For students.",
};

const SITE_SETTINGS_DEFAULTS: SiteSettingsData = {
  siteName: "Woxsen Student Council",
  tagline: undefined,
  contactEmail: undefined,
  instagramUrl: undefined,
  linkedinUrl: undefined,
  campus: {
    name: "Hyderabad",
    coordinates: "17.5°N 78.4°E",
    timezone: "Asia/Kolkata",
    timezoneAbbr: "IST",
  },
  grievanceCategories: [
    {
      value: "harassment",
      label: "Harassment / discrimination",
      to: "grievance@woxsen.edu.in",
    },
    {
      value: "academic",
      label: "Academic concern",
      to: "grievance@woxsen.edu.in",
    },
    {
      value: "facility",
      label: "Facility / infrastructure",
      to: "grievance@woxsen.edu.in",
    },
    { value: "other", label: "Other", to: "grievance@woxsen.edu.in" },
  ],
  grievanceMailTo: "council@woxsen.edu.in",
};

export const getHomepageConfig = cache(
  async (): Promise<HomepageConfigData> => {
    const raw = await db.query.homepageConfig.findFirst();
    if (!raw) return HOMEPAGE_DEFAULTS;

    const hero = raw.hero ?? ({} as NonNullable<typeof raw.hero>);
    const closing =
      raw.closingCta ?? ({} as NonNullable<typeof raw.closingCta>);
    const stats = raw.stats ?? [];
    const manifestoLines = raw.manifestoLines ?? [];
    const quickActions = raw.quickActions ?? [];

    // Resolve flagship event id → slug.
    let flagshipSlug: string | undefined;
    if (raw.flagshipEventId) {
      const ev = await db.query.events.findFirst({
        where: eq(eventsT.id, raw.flagshipEventId),
        columns: { slug: true },
      });
      flagshipSlug = ev?.slug || undefined;
    }

    // Resolve featured club ids → slugs (preserve order).
    let featuredClubSlugs: string[] = [];
    const clubIds = raw.featuredClubIds ?? [];
    if (clubIds.length > 0) {
      const rows = await db
        .select({ id: clubsT.id, slug: clubsT.slug })
        .from(clubsT)
        .where(inArray(clubsT.id, clubIds));
      const bySlug = new Map(rows.map((r) => [r.id, r.slug]));
      featuredClubSlugs = clubIds
        .map((id) => bySlug.get(id))
        .filter((s): s is string => Boolean(s));
    }

    // Vault stories: custom stories (full editorial control) take priority;
    // fall back to recap-based resolution (explicit ids → auto-fill recaps).
    const customVault: VaultStoryConfig[] = raw.vaultStories ?? [];
    const vaultStories =
      customVault.length > 0
        ? customVault
            .filter((v) => v?.title?.trim())
            .map(
              (v): VaultStory => ({
                id: v.id,
                title: v.title,
                kicker: v.kicker || "",
                blurb: v.line || "",
                posterImage:
                  v.mediaKind === "video"
                    ? v.posterSrc
                    : v.mediaKind === "image"
                      ? v.mediaSrc
                      : "",
                videoUrl: v.mediaKind === "video" ? v.mediaSrc : undefined,
                href: v.href || "/events",
                year: v.year || undefined,
                mediaKind: v.mediaKind,
              }),
            )
        : await resolveVaultStories(raw.vaultStoryIds ?? []);

    return {
      hero: {
        kicker:
          currentSessionCopy(hero.kicker) || HOMEPAGE_DEFAULTS.hero.kicker,
        headline: hero.headline || HOMEPAGE_DEFAULTS.hero.headline,
        sublineLead: hero.sublineLead || HOMEPAGE_DEFAULTS.hero.sublineLead,
        sublineWords:
          hero.sublineWords && hero.sublineWords.length > 0
            ? hero.sublineWords
            : HOMEPAGE_DEFAULTS.hero.sublineWords,
        subParagraph: hero.subParagraph || HOMEPAGE_DEFAULTS.hero.subParagraph,
        ctas:
          hero.ctas && hero.ctas.length > 0
            ? hero.ctas
            : HOMEPAGE_DEFAULTS.hero.ctas,
        marqueeText: hero.marqueeText || HOMEPAGE_DEFAULTS.hero.marqueeText,
      },
      statsKicker:
        currentSessionCopy(raw.statsKicker) || HOMEPAGE_DEFAULTS.statsKicker,
      stats: stats.length > 0 ? stats : HOMEPAGE_DEFAULTS.stats,
      manifestoKicker:
        currentSessionCopy(raw.manifestoKicker) ||
        HOMEPAGE_DEFAULTS.manifestoKicker,
      manifestoLines:
        manifestoLines.length > 0
          ? manifestoLines
          : HOMEPAGE_DEFAULTS.manifestoLines,
      manifestoFooter: raw.manifestoFooter || HOMEPAGE_DEFAULTS.manifestoFooter,
      quickActions:
        quickActions.length > 0 ? quickActions : HOMEPAGE_DEFAULTS.quickActions,
      closingCta: {
        kicker: closing.kicker || HOMEPAGE_DEFAULTS.closingCta.kicker,
        headlineLead:
          closing.headlineLead || HOMEPAGE_DEFAULTS.closingCta.headlineLead,
        headlineTail:
          closing.headlineTail || HOMEPAGE_DEFAULTS.closingCta.headlineTail,
        ctas:
          closing.ctas && closing.ctas.length > 0
            ? closing.ctas
            : HOMEPAGE_DEFAULTS.closingCta.ctas,
      },
      flagshipEventSlug: flagshipSlug,
      featuredClubSlugs,
      vaultStories,
      tagline: raw.tagline || HOMEPAGE_DEFAULTS.tagline,
    };
  },
);

async function resolveVaultStories(ids: number[]): Promise<VaultStory[]> {
  const toVault = (d: {
    id: number;
    title: string | null;
    kicker: string | null;
    blurb: string | null;
    slug: string | null;
    heroMedia?: { url?: string | null } | null;
    heroVideoUrl: string | null;
    publishedAt: string | null;
    event?: { slug: string | null } | null;
  }): VaultStory => {
    const slug = d.event?.slug || d.slug || "";
    return {
      id: asString(d.id),
      title: asString(d.title),
      kicker: asString(d.kicker),
      blurb: asString(d.blurb),
      posterImage: mediaUrl(d.heroMedia),
      videoUrl: d.heroVideoUrl || undefined,
      href: slug ? `/events/${slug}` : "/events?view=past",
      publishedAt: d.publishedAt || undefined,
    };
  };

  if (ids.length > 0) {
    const rows = await db.query.recaps.findMany({
      where: inArray(recapsT.id, ids),
      with: { heroMedia: true, event: { columns: { slug: true } } },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids
      .map((id) => byId.get(id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map(toVault);
  }

  // auto-fill with most recent published recaps
  const rows = await db.query.recaps.findMany({
    where: eq(recapsT.status, "published"),
    with: { heroMedia: true, event: { columns: { slug: true } } },
    orderBy: desc(recapsT.publishedAt),
    limit: 4,
  });
  return rows.map(toVault);
}

// ─────────────── site settings ───────────────

export const getSiteSettings = cache(async (): Promise<SiteSettingsData> => {
  const raw = await db.query.siteSettings.findFirst();
  if (!raw) return SITE_SETTINGS_DEFAULTS;
  const campus = raw.campus ?? SITE_SETTINGS_DEFAULTS.campus;
  const cats = raw.grievanceCategories ?? [];
  return {
    siteName: raw.siteName || SITE_SETTINGS_DEFAULTS.siteName,
    tagline: raw.tagline || undefined,
    contactEmail: raw.contactEmail || undefined,
    instagramUrl: raw.instagramUrl || undefined,
    linkedinUrl: raw.linkedinUrl || undefined,
    campus: {
      name: campus.name || SITE_SETTINGS_DEFAULTS.campus.name,
      coordinates:
        campus.coordinates || SITE_SETTINGS_DEFAULTS.campus.coordinates,
      timezone: campus.timezone || SITE_SETTINGS_DEFAULTS.campus.timezone,
      timezoneAbbr:
        campus.timezoneAbbr || SITE_SETTINGS_DEFAULTS.campus.timezoneAbbr,
    },
    grievanceCategories:
      cats.length > 0 ? cats : SITE_SETTINGS_DEFAULTS.grievanceCategories,
    grievanceMailTo:
      raw.grievanceMailTo || SITE_SETTINGS_DEFAULTS.grievanceMailTo,
  };
});

// ─────────────── faqs ───────────────

export const getFaqs = cache(
  async (page?: FaqItem["page"]): Promise<FaqItem[]> => {
    const rows = await db.query.faqs.findMany({
      where: page ? eq(faqsT.page, page) : undefined,
      orderBy: asc(faqsT.sortOrder),
    });
    return rows.map((d) => ({
      id: asString(d.id),
      question: asString(d.question),
      answer: asString(d.answer),
      page: asString(d.page) as FaqItem["page"],
      order: typeof d.sortOrder === "number" ? d.sortOrder : 99,
    }));
  },
);

// ─────────────── tickets (attendee-facing) ───────────────

export type TicketView = {
  ticketCode: string;
  attendeeId: string;
  registrationId: string;
  name: string;
  email: string;
  phone: string | null;
  status: RegistrationStatus;
  amountInPaise: number;
  checkedInAt: string | null;
  createdAt: string;
  event: {
    id: number;
    slug: string;
    title: string;
    date: string;
    endDate: string | null;
    venue: string;
    category: string;
    banner: string;
  };
};

export type AttendeeWithRefs = {
  id: string;
  registrationId: string;
  ticketCode: string;
  checkedInAt: string | null;
  createdAt: string;
  registration?: {
    name: string | null;
    email: string | null;
    phone: string | null;
    status: RegistrationStatus | null;
    amountInPaise: number | null;
  } | null;
  event?: {
    id: number;
    slug: string | null;
    title: string | null;
    date: string | null;
    endDate: string | null;
    venue: string | null;
    category: string | null;
    banner?: { url?: string | null } | null;
  } | null;
};

export function toTicket(a: AttendeeWithRefs): TicketView | undefined {
  if (!a.event) return undefined;
  return {
    ticketCode: a.ticketCode,
    attendeeId: a.id,
    registrationId: a.registrationId,
    name: asString(a.registration?.name),
    email: asString(a.registration?.email),
    phone: a.registration?.phone ?? null,
    status: (a.registration?.status ?? "confirmed") as RegistrationStatus,
    amountInPaise: a.registration?.amountInPaise ?? 0,
    checkedInAt: a.checkedInAt ?? null,
    createdAt: asString(a.createdAt),
    event: {
      id: a.event.id,
      slug: asString(a.event.slug),
      title: asString(a.event.title),
      date: asString(a.event.date),
      endDate: a.event.endDate ?? null,
      venue: asString(a.event.venue),
      category: asString(a.event.category),
      banner: mediaUrl(a.event.banner),
    },
  };
}

/** One ticket by its code (the /t/[code] page). */
export const getTicketByCode = cache(
  async (code: string): Promise<TicketView | undefined> => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return undefined;
    const a = await db.query.attendees.findFirst({
      where: eq(attendeesT.ticketCode, normalized),
      with: {
        registration: true,
        event: { with: { banner: true } },
      },
    });
    return a ? toTicket(a as AttendeeWithRefs) : undefined;
  },
);

/** All tickets for a contact (email or phone) — the /t/lookup recovery page. */
export async function getTicketsByContact(
  contact: string,
): Promise<TicketView[]> {
  const raw = contact.trim();
  if (!raw) return [];
  const lower = raw.toLowerCase();
  const regs = await db.query.eventRegistrations.findMany({
    where: or(sql`lower(${regT.email}) = ${lower}`, eq(regT.phone, raw)),
    with: {
      attendees: {
        with: { event: { with: { banner: true } } },
      },
    },
  });
  const tickets: TicketView[] = [];
  for (const reg of regs) {
    for (const a of reg.attendees) {
      const t = toTicket({
        ...(a as AttendeeWithRefs),
        registration: {
          name: reg.name,
          email: reg.email,
          phone: reg.phone,
          status: reg.status,
          amountInPaise: reg.amountInPaise,
        },
      });
      if (t) tickets.push(t);
    }
  }
  // Most recent event first.
  return tickets.sort(
    (x, y) => +new Date(y.event.date) - +new Date(x.event.date),
  );
}

// ─────────────────────────────────── sports ─────────────────────────────────
// The sports vertical: tournaments, leagues, teams, matches, people, and the
// /sports page config. Getters mirror the pattern above — React `cache()`,
// defensive JSON coercion, `mediaUrl` for joined media.

// ─────────────── public-facing types ───────────────

export interface SportsTournament {
  id: number;
  slug: string;
  title: string;
  status: SportCompetitionStatus;
  sport: SportType;
  year: number;
  division: SportDivision;
  venue: string;
  startDate: string | undefined;
  endDate: string | undefined;
  banner: string;
  excerpt: string;
  description: string;
  featured: boolean;
  publishedAt: string | undefined;
}

export interface SportsLeague extends SportsTournament {
  standings: SportStandingRow[];
}

export interface SportsTeam {
  id: number;
  slug: string;
  name: string;
  logo: string;
  clubId: number | undefined;
}

export interface SportsMatch {
  id: number;
  tournamentId: number | undefined;
  leagueId: number | undefined;
  sport: SportType;
  round: string | undefined;
  teamAId: number | undefined;
  teamBId: number | undefined;
  teamAName: string;
  teamBName: string;
  teamALogo: string;
  teamBLogo: string;
  competitionTitle: string;
  competitionHref: string | undefined;
  competitionYear: number | undefined;
  matchDate: string | undefined;
  venue: string | undefined;
  status: SportMatchStatus;
  scoreA: number | undefined;
  scoreB: number | undefined;
  events: SportMatchEvent[];
  postMatch: SportPostMatch;
}

export interface SportsPerson {
  id: number;
  slug: string;
  name: string;
  photo: string;
  role: SportPersonRole;
  bio: string;
  graduationYear: number | undefined;
  sport: SportType | undefined;
  email: string | undefined;
  phone: string | undefined;
}

export interface SportsPageConfig {
  academyLogo: string;
  tagline: string;
  galleryImages: string[];
}

// ─────────────── mappers ───────────────

function mapTournament(d: {
  id: number;
  slug: string;
  title: string;
  status: SportCompetitionStatus;
  sport: SportType;
  year: number;
  division: SportDivision;
  venue: string | null;
  startDate: string | null;
  endDate: string | null;
  banner?: { url?: string | null } | null;
  excerpt: string | null;
  description: string | null;
  featured: boolean;
  publishedAt: string | null;
}): SportsTournament {
  return {
    id: d.id,
    slug: asString(d.slug),
    title: asString(d.title),
    status: d.status,
    sport: d.sport,
    year: d.year,
    division: d.division,
    venue: asString(d.venue),
    startDate: d.startDate || undefined,
    endDate: d.endDate || undefined,
    banner: mediaUrl(d.banner),
    excerpt: asString(d.excerpt),
    description: asString(d.description),
    featured: d.featured,
    publishedAt: d.publishedAt || undefined,
  };
}

function mapLeague(d: {
  id: number;
  slug: string;
  title: string;
  status: SportCompetitionStatus;
  sport: SportType;
  year: number;
  division: SportDivision;
  venue: string | null;
  startDate: string | null;
  endDate: string | null;
  banner?: { url?: string | null } | null;
  excerpt: string | null;
  description: string | null;
  featured: boolean;
  publishedAt: string | null;
  standings: unknown;
}): SportsLeague {
  return {
    ...mapTournament(d),
    standings: Array.isArray(d.standings)
      ? (d.standings as SportStandingRow[])
      : [],
  };
}

function mapTeam(d: {
  id: number;
  slug: string;
  name: string;
  logo?: { url?: string | null } | null;
  clubId: number | null;
}): SportsTeam {
  return {
    id: d.id,
    slug: asString(d.slug),
    name: asString(d.name),
    logo: mediaUrl(d.logo),
    clubId: d.clubId ?? undefined,
  };
}

function mapMatch(d: {
  id: number;
  tournamentId: number | null;
  leagueId: number | null;
  sport: SportType;
  round: string | null;
  teamAId: number | null;
  teamBId: number | null;
  teamA?: { name: string; logo?: { url?: string | null } | null } | null;
  teamB?: { name: string; logo?: { url?: string | null } | null } | null;
  tournament?: {
    title: string;
    slug: string;
    year: number;
    status: SportCompetitionStatus;
  } | null;
  league?: {
    title: string;
    slug: string;
    year: number;
    status: SportCompetitionStatus;
  } | null;
  matchDate: string | null;
  venue: string | null;
  status: SportMatchStatus;
  scoreA: number | null;
  scoreB: number | null;
  events: unknown;
  postMatch: unknown;
}): SportsMatch {
  const publishedTournament =
    d.tournament?.status === "published" ? d.tournament : undefined;
  const publishedLeague =
    d.league?.status === "published" ? d.league : undefined;
  const competition = publishedTournament ?? publishedLeague;
  return {
    id: d.id,
    tournamentId: d.tournamentId ?? undefined,
    leagueId: d.leagueId ?? undefined,
    sport: d.sport,
    round: d.round || undefined,
    teamAId: d.teamAId ?? undefined,
    teamBId: d.teamBId ?? undefined,
    teamAName: d.teamA?.name ?? "",
    teamBName: d.teamB?.name ?? "",
    teamALogo: mediaUrl(d.teamA?.logo),
    teamBLogo: mediaUrl(d.teamB?.logo),
    competitionTitle: competition?.title ?? "",
    competitionHref: publishedTournament
      ? `/sports/tournaments/${publishedTournament.slug}`
      : publishedLeague
        ? `/sports/leagues/${publishedLeague.slug}`
        : undefined,
    competitionYear: competition?.year,
    matchDate: d.matchDate || undefined,
    venue: asString(d.venue),
    status: d.status,
    scoreA: d.scoreA ?? undefined,
    scoreB: d.scoreB ?? undefined,
    events: Array.isArray(d.events) ? (d.events as SportMatchEvent[]) : [],
    postMatch: (d.postMatch as SportPostMatch) ?? {},
  };
}

function mapPerson(d: {
  id: number;
  slug: string;
  name: string;
  photo?: { url?: string | null } | null;
  role: SportPersonRole;
  bio: string | null;
  graduationYear: number | null;
  sport: SportType | null;
  email: string | null;
  phone: string | null;
}): SportsPerson {
  return {
    id: d.id,
    slug: asString(d.slug),
    name: asString(d.name),
    photo: mediaUrl(d.photo),
    role: d.role,
    bio: asString(d.bio),
    graduationYear: d.graduationYear ?? undefined,
    sport: d.sport ?? undefined,
    email: d.email || undefined,
    phone: d.phone || undefined,
  };
}

// ─────────────── getters ───────────────

export const getSportsTournaments = cache(
  async (year?: number): Promise<SportsTournament[]> => {
    const rows = await db.query.sportsTournaments.findMany({
      where: and(
        eq(sportsTournamentsT.status, "published"),
        ...(year ? [eq(sportsTournamentsT.year, year)] : []),
      ),
      with: { banner: true },
      orderBy: [
        asc(sportsTournamentsT.startDate),
        asc(sportsTournamentsT.title),
      ],
    });
    return rows.map(mapTournament);
  },
);

export const getSportsTournament = cache(
  async (slug: string): Promise<SportsTournament | undefined> => {
    const row = await db.query.sportsTournaments.findFirst({
      where: and(
        eq(sportsTournamentsT.status, "published"),
        eq(sportsTournamentsT.slug, slug),
      ),
      with: { banner: true },
    });
    return row ? mapTournament(row) : undefined;
  },
);

export const getSportsLeagues = cache(
  async (year?: number): Promise<SportsLeague[]> => {
    const rows = await db.query.sportsLeagues.findMany({
      where: and(
        eq(sportsLeaguesT.status, "published"),
        ...(year ? [eq(sportsLeaguesT.year, year)] : []),
      ),
      with: { banner: true },
      orderBy: [asc(sportsLeaguesT.startDate), asc(sportsLeaguesT.title)],
    });
    return rows.map(mapLeague);
  },
);

export const getSportsLeague = cache(
  async (slug: string): Promise<SportsLeague | undefined> => {
    const row = await db.query.sportsLeagues.findFirst({
      where: and(
        eq(sportsLeaguesT.status, "published"),
        eq(sportsLeaguesT.slug, slug),
      ),
      with: { banner: true },
    });
    return row ? mapLeague(row) : undefined;
  },
);

export const getSportsTeams = cache(async (): Promise<SportsTeam[]> => {
  const rows = await db.query.sportsTeams.findMany({
    with: { logo: true },
    orderBy: asc(sportsTeamsT.name),
  });
  return rows.map(mapTeam);
});

export const getSportsMatches = cache(
  async (opts?: {
    tournamentId?: number;
    leagueId?: number;
    year?: number;
  }): Promise<SportsMatch[]> => {
    const where = [];
    if (opts?.tournamentId)
      where.push(eq(sportsMatchesT.tournamentId, opts.tournamentId));
    if (opts?.leagueId) where.push(eq(sportsMatchesT.leagueId, opts.leagueId));
    const rows = await db.query.sportsMatches.findMany({
      where: where.length ? and(...where) : undefined,
      with: {
        teamA: { with: { logo: true } },
        teamB: { with: { logo: true } },
        tournament: true,
        league: true,
      },
      orderBy: asc(sportsMatchesT.matchDate),
    });
    let matches = rows.map(mapMatch);
    if (opts?.year) {
      matches = matches.filter(
        (m) =>
          m.competitionYear === opts.year ||
          (m.matchDate && Number(m.matchDate.slice(0, 4)) === opts.year),
      );
    }
    return matches;
  },
);

export const getSportsMatch = cache(
  async (id: number): Promise<SportsMatch | undefined> => {
    const row = await db.query.sportsMatches.findFirst({
      where: eq(sportsMatchesT.id, id),
      with: {
        teamA: { with: { logo: true } },
        teamB: { with: { logo: true } },
        tournament: true,
        league: true,
      },
    });
    return row ? mapMatch(row) : undefined;
  },
);

export const getSportsPeople = cache(
  async (role?: SportPersonRole): Promise<SportsPerson[]> => {
    const rows = await db.query.sportsPeople.findMany({
      where: role ? eq(sportsPeopleT.role, role) : undefined,
      with: { photo: true },
      orderBy: [asc(sportsPeopleT.sortOrder), asc(sportsPeopleT.name)],
    });
    return rows.map(mapPerson);
  },
);

export const getSportsPageConfig = cache(
  async (): Promise<SportsPageConfig> => {
    const row = await db.query.sportsPageConfig.findFirst({
      with: { academyLogo: true },
    });
    const ids = Array.isArray(row?.galleryImageIds) ? row!.galleryImageIds : [];
    let galleryImages: string[] = [];
    if (ids.length > 0) {
      const mediaRows = await db
        .select({ id: mediaT.id, url: mediaT.url })
        .from(mediaT)
        .where(inArray(mediaT.id, ids));
      const urlById = new Map(mediaRows.map((m) => [m.id, m.url]));
      galleryImages = ids.map((id) => urlById.get(id) ?? "").filter(Boolean);
    }
    return {
      academyLogo: mediaUrl(row?.academyLogo),
      tagline: asString(row?.tagline),
      galleryImages,
    };
  },
);
