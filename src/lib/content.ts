import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, gte, ne, or, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  announcements as announcementsT,
  attendees as attendeesT,
  clubs as clubsT,
  councilMembers as councilT,
  events as eventsT,
  eventRegistrations as regT,
  faqs as faqsT,
  highlights as highlightsT,
  recaps as recapsT,
  supportChannels as supportT,
  type RegistrationStatus,
} from "@/db/schema";

import type {
  Announcement,
  Club,
  CouncilMember,
  EventItem,
  FaqItem,
  Highlight,
  HomepageConfigData,
  SiteSettingsData,
  SupportChannel,
  VaultStory,
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
    isPresident: Boolean(d.isPresident),
    featured: Boolean(d.featured),
    order: typeof d.sortOrder === "number" ? d.sortOrder : 99,
  }));
});

export async function getPresident(): Promise<CouncilMember | undefined> {
  const all = await getCouncil();
  return (
    all.find((m) => m.isPresident) ??
    all.find((m) => /president/i.test(m.role) && !/vice/i.test(m.role))
  );
}

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
      or(gte(eventsT.date, yesterday), gte(eventsT.endDate, now)),
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
  return all
    .filter((e) => {
      const end = e.endDate
        ? +new Date(e.endDate)
        : +new Date(e.date) + 86_400_000;
      return end < now;
    })
    .reverse();
}

// ─────────────── clubs ───────────────

export const getClubs = cache(async (): Promise<Club[]> => {
  const rows = await db.query.clubs.findMany({
    with: { logo: true },
    orderBy: asc(clubsT.name),
  });
  return rows.map((d) => ({
    slug: asString(d.slug),
    name: asString(d.name),
    logo: mediaUrl(d.logo),
    blurb: asString(d.blurb),
    joinUrl: d.joinUrl || undefined,
    tags: Array.isArray(d.tags) ? d.tags : [],
    members: typeof d.members === "number" ? d.members : undefined,
  }));
});

// ─────────────── support ───────────────

export const getSupportChannels = cache(
  async (): Promise<SupportChannel[]> => {
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
  },
);

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
      { label: "Raise a concern", href: "/support#grievance-form", variant: "outline" },
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
    { value: "harassment", label: "Harassment / discrimination" },
    { value: "academic", label: "Academic concern" },
    { value: "facility", label: "Facility / infrastructure" },
    { value: "other", label: "Other" },
  ],
  grievanceMailTo: "council@woxsen.edu.in",
};

export const getHomepageConfig = cache(
  async (): Promise<HomepageConfigData> => {
    const raw = await db.query.homepageConfig.findFirst();
    if (!raw) return HOMEPAGE_DEFAULTS;

    const hero = raw.hero ?? ({} as NonNullable<typeof raw.hero>);
    const closing = raw.closingCta ?? ({} as NonNullable<typeof raw.closingCta>);
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

    // Vault stories: explicit ids, else most-recent published recaps.
    const vaultStories = await resolveVaultStories(raw.vaultStoryIds ?? []);

    return {
      hero: {
        kicker: currentSessionCopy(hero.kicker) || HOMEPAGE_DEFAULTS.hero.kicker,
        headline: hero.headline || HOMEPAGE_DEFAULTS.hero.headline,
        sublineLead: hero.sublineLead || HOMEPAGE_DEFAULTS.hero.sublineLead,
        sublineWords:
          hero.sublineWords && hero.sublineWords.length > 0
            ? hero.sublineWords
            : HOMEPAGE_DEFAULTS.hero.sublineWords,
        subParagraph:
          hero.subParagraph || HOMEPAGE_DEFAULTS.hero.subParagraph,
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
      manifestoFooter:
        raw.manifestoFooter || HOMEPAGE_DEFAULTS.manifestoFooter,
      quickActions:
        quickActions.length > 0
          ? quickActions
          : HOMEPAGE_DEFAULTS.quickActions,
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
      href: slug ? `/events/${slug}` : "/archive",
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
  return tickets.sort((x, y) => +new Date(y.event.date) - +new Date(x.event.date));
}
