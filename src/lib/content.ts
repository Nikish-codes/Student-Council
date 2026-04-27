import "server-only";
import { cache } from "react";
import { getPayload } from "payload";
import config from "@payload-config";

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
 * Content getters — all read from Payload (Turso) via the local API.
 *
 * Each getter is wrapped in React's `cache()` so multiple server components
 * within the same request share a single query result. Payload itself
 * memoizes the underlying instance, so calling `getPayload({ config })`
 * is cheap on subsequent invocations.
 *
 * Return shapes match the original Zod-typed schema so call sites are
 * unchanged apart from being awaited.
 */

const payloadPromise = getPayload({ config });

// ─────────────── helpers ───────────────

type AnyDoc = Record<string, unknown>;

function asString(v: unknown): string {
  return v == null ? "" : String(v);
}

function currentSessionCopy(v: unknown): string {
  return asString(v).replace(/2025\/26|2025-26|25\/26/g, "2026/27");
}

/** Pull a usable URL out of an upload field that may be id|object|null. */
function mediaUrl(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string" || typeof v === "number") return ""; // depth was 0
  const o = v as { url?: string; filename?: string };
  return o.url ?? (o.filename ? `/${o.filename}` : "");
}

/** Best-effort plain-text extraction from a Lexical editor state. */
function lexicalToText(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  const root = (v as { root?: { children?: unknown[] } }).root;
  if (!root?.children) return "";
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      text?: string;
      children?: unknown[];
    };
    if (typeof n.text === "string") parts.push(n.text);
    if (Array.isArray(n.children)) n.children.forEach(walk);
    if (n.type === "paragraph" || n.type === "heading") parts.push("\n");
  };
  root.children.forEach(walk);
  return parts.join("").trim();
}

// ─────────────── announcements ───────────────

export const getAnnouncements = cache(async (): Promise<Announcement[]> => {
  const payload = await payloadPromise;
  const r = await payload.find({
    collection: "announcements",
    limit: 200,
    sort: "-date",
    overrideAccess: true,
  });
  return r.docs
    .map((d: AnyDoc) => ({
      id: asString(d.id),
      title: asString(d.title),
      href: (d.href as string | undefined) || undefined,
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
  const payload = await payloadPromise;
  const r = await payload.find({
    collection: "council-members",
    limit: 200,
    depth: 1,
    sort: "order",
    overrideAccess: true,
  });
  return r.docs.map((d: AnyDoc) => ({
    id: asString(d.id),
    name: asString(d.name),
    role: asString(d.role),
    program: asString(d.program),
    photo: mediaUrl(d.photo),
    email: (d.email as string | undefined) || undefined,
    linkedin: (d.linkedin as string | undefined) || undefined,
    message: (d.message as string | undefined) || undefined,
    quote: (d.quote as string | undefined) || undefined,
    isPresident: Boolean(d.isPresident),
    featured: Boolean(d.featured),
    order: typeof d.order === "number" ? d.order : 99,
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

function mapEventDoc(d: AnyDoc): EventItem {
  return {
    slug: asString(d.slug),
    title: asString(d.title),
    category: asString(d.category) as EventItem["category"],
    date: asString(d.date),
    endDate: (d.endDate as string | undefined) || undefined,
    venue: asString(d.venue),
    banner: mediaUrl(d.banner),
    excerpt: asString(d.excerpt),
    description: lexicalToText(d.description),
    videoUrl: (d.videoUrl as string | undefined) || undefined,
    registrationUrl: (d.registrationUrl as string | undefined) || undefined,
    attendees: typeof d.attendees === "number" ? d.attendees : undefined,
    featured: Boolean(d.featured),
  };
}

export const getEvents = cache(async (): Promise<EventItem[]> => {
  const payload = await payloadPromise;
  const r = await payload.find({
    collection: "events",
    where: { status: { equals: "published" } },
    limit: 500,
    depth: 1,
    sort: "date",
    overrideAccess: true,
  });
  return r.docs.map((d: AnyDoc) => mapEventDoc(d));
});

export const getEvent = cache(async (slug: string): Promise<EventItem | undefined> => {
  const payload = await payloadPromise;
  const r = await payload.find({
    collection: "events",
    where: {
      and: [
        { status: { equals: "published" } },
        { slug: { equals: slug } },
      ],
    },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  const doc = r.docs[0] as AnyDoc | undefined;
  return doc ? mapEventDoc(doc) : undefined;
});

export const getRelatedEvents = cache(
  async (event: EventItem, limit = 3): Promise<EventItem[]> => {
    const payload = await payloadPromise;
    const r = await payload.find({
      collection: "events",
      where: {
        and: [
          { status: { equals: "published" } },
          { category: { equals: event.category } },
          { slug: { not_equals: event.slug } },
        ],
      },
      limit,
      depth: 1,
      sort: "date",
      overrideAccess: true,
    });
    return r.docs.map((d: AnyDoc) => mapEventDoc(d));
  },
);

export async function getUpcomingEvents(limit = 3): Promise<EventItem[]> {
  const payload = await payloadPromise;
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  const r = await payload.find({
    collection: "events",
    where: {
      and: [
        { status: { equals: "published" } },
        {
          or: [
            { date: { greater_than_equal: yesterday } },
            { endDate: { greater_than_equal: now } },
          ],
        },
      ],
    },
    limit,
    depth: 1,
    sort: "date",
    overrideAccess: true,
  });
  return r.docs.map((d: AnyDoc) => mapEventDoc(d));
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
  const payload = await payloadPromise;
  const r = await payload.find({
    collection: "clubs",
    limit: 200,
    depth: 1,
    sort: "name",
    overrideAccess: true,
  });
  return r.docs.map((d: AnyDoc) => ({
    slug: asString(d.slug),
    name: asString(d.name),
    logo: mediaUrl(d.logo),
    blurb: asString(d.blurb),
    joinUrl: (d.joinUrl as string | undefined) || undefined,
    tags: Array.isArray(d.tags) ? (d.tags as string[]) : [],
    members: typeof d.members === "number" ? d.members : undefined,
  }));
});

// ─────────────── support ───────────────

export const getSupportChannels = cache(
  async (): Promise<SupportChannel[]> => {
    const payload = await payloadPromise;
    const r = await payload.find({
      collection: "support-channels",
      limit: 200,
      overrideAccess: true,
    });
    return r.docs.map((d: AnyDoc) => ({
      id: asString(d.id),
      name: asString(d.name),
      purpose: asString(d.purpose),
      description: asString(d.description),
      icon: asString(d.icon),
      ownedBy: asString(d.ownedBy),
      bring: Array.isArray(d.bring) ? (d.bring as string[]) : [],
      councilRole: asString(d.councilRole),
    }));
  },
);

// ─────────────── highlights ───────────────

export const getHighlights = cache(async (): Promise<Highlight[]> => {
  const payload = await payloadPromise;
  const r = await payload.find({
    collection: "highlights",
    limit: 200,
    depth: 1,
    overrideAccess: true,
  });
  return r.docs.map((d: AnyDoc) => ({
    id: asString(d.id),
    src: mediaUrl(d.image),
    alt: asString(d.alt),
    caption: (d.caption as string | undefined) || undefined,
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

function recapDocToVault(d: AnyDoc): VaultStory {
  const event = d.event as AnyDoc | null | undefined;
  const slug =
    asString((event as AnyDoc | undefined)?.slug) || asString(d.slug);
  return {
    id: asString(d.id),
    title: asString(d.title),
    kicker: asString(d.kicker),
    blurb: asString(d.blurb),
    posterImage: mediaUrl(d.heroMedia),
    videoUrl: (d.heroVideoUrl as string | undefined) || undefined,
    href: slug ? `/events/${slug}` : "/archive",
    publishedAt: (d.publishedAt as string | undefined) || undefined,
  };
}

export const getHomepageConfig = cache(
  async (): Promise<HomepageConfigData> => {
    const payload = await payloadPromise;
    let raw: AnyDoc;
    try {
      raw = (await payload.findGlobal({
        slug: "homepage-config",
        depth: 2,
        overrideAccess: true,
      })) as AnyDoc;
    } catch {
      return HOMEPAGE_DEFAULTS;
    }

    const heroRaw = (raw.hero as AnyDoc | undefined) ?? {};
    const sublineWordsRaw = Array.isArray(heroRaw.sublineWords)
      ? (heroRaw.sublineWords as AnyDoc[])
          .map((w) => asString(w.word))
          .filter(Boolean)
      : [];
    const heroCtasRaw = Array.isArray(heroRaw.ctas)
      ? (heroRaw.ctas as AnyDoc[]).map((c) => ({
          label: asString(c.label),
          href: asString(c.href),
          variant:
            (asString(c.variant) as "primary" | "outline" | "ghost") ||
            "primary",
        }))
      : [];

    const statsRaw = Array.isArray(raw.stats)
      ? (raw.stats as AnyDoc[]).map((s) => ({
          value: typeof s.value === "number" ? s.value : 0,
          suffix: (s.suffix as string | undefined) || undefined,
          displayValue: (s.displayValue as string | undefined) || undefined,
          label: asString(s.label),
        }))
      : [];

    const manifestoLinesRaw = Array.isArray(raw.manifestoLines)
      ? (raw.manifestoLines as AnyDoc[]).map((l) => ({
          lead: asString(l.lead),
          tail: asString(l.tail),
        }))
      : [];

    const quickActionsRaw = Array.isArray(raw.quickActions)
      ? (raw.quickActions as AnyDoc[]).map((q) => ({
          icon: asString(q.icon) || "Sparkles",
          title: asString(q.title),
          body: asString(q.body),
          href: asString(q.href),
        }))
      : [];

    const closingRaw = (raw.closingCta as AnyDoc | undefined) ?? {};
    const closingCtas = Array.isArray(closingRaw.ctas)
      ? (closingRaw.ctas as AnyDoc[]).map((c) => ({
          label: asString(c.label),
          href: asString(c.href),
          variant:
            (asString(c.variant) as "primary" | "outline" | "ghost") ||
            "primary",
        }))
      : [];

    const flagship = raw.flagshipEvent as AnyDoc | string | null | undefined;
    const flagshipSlug =
      flagship && typeof flagship === "object"
        ? asString((flagship as AnyDoc).slug) || undefined
        : undefined;

    const featuredClubsRaw = Array.isArray(raw.featuredClubs)
      ? (raw.featuredClubs as Array<AnyDoc | string>)
          .map((c) =>
            typeof c === "object" && c
              ? asString((c as AnyDoc).slug)
              : "",
          )
          .filter(Boolean)
      : [];

    let vaultStoriesRaw: VaultStory[] = [];
    if (Array.isArray(raw.vaultStories) && raw.vaultStories.length > 0) {
      vaultStoriesRaw = (raw.vaultStories as Array<AnyDoc | string>)
        .filter((v): v is AnyDoc => typeof v === "object" && v !== null)
        .map(recapDocToVault);
    } else {
      // auto-fill with most recent published recaps
      try {
        const recaps = await payload.find({
          collection: "recaps",
          where: { _status: { equals: "published" } },
          limit: 4,
          depth: 2,
          sort: "-publishedAt",
          overrideAccess: true,
        });
        vaultStoriesRaw = recaps.docs.map((d: AnyDoc) => recapDocToVault(d));
      } catch {
        vaultStoriesRaw = [];
      }
    }

    const out: HomepageConfigData = {
      hero: {
        kicker: currentSessionCopy(heroRaw.kicker) || HOMEPAGE_DEFAULTS.hero.kicker,
        headline:
          asString(heroRaw.headline) || HOMEPAGE_DEFAULTS.hero.headline,
        sublineLead:
          asString(heroRaw.sublineLead) || HOMEPAGE_DEFAULTS.hero.sublineLead,
        sublineWords:
          sublineWordsRaw.length > 0
            ? sublineWordsRaw
            : HOMEPAGE_DEFAULTS.hero.sublineWords,
        subParagraph:
          asString(heroRaw.subParagraph) ||
          HOMEPAGE_DEFAULTS.hero.subParagraph,
        ctas: heroCtasRaw.length > 0 ? heroCtasRaw : HOMEPAGE_DEFAULTS.hero.ctas,
        marqueeText:
          asString(heroRaw.marqueeText) ||
          HOMEPAGE_DEFAULTS.hero.marqueeText,
      },
      statsKicker:
        currentSessionCopy(raw.statsKicker) || HOMEPAGE_DEFAULTS.statsKicker,
      stats: statsRaw.length > 0 ? statsRaw : HOMEPAGE_DEFAULTS.stats,
      manifestoKicker:
        currentSessionCopy(raw.manifestoKicker) || HOMEPAGE_DEFAULTS.manifestoKicker,
      manifestoLines:
        manifestoLinesRaw.length > 0
          ? manifestoLinesRaw
          : HOMEPAGE_DEFAULTS.manifestoLines,
      manifestoFooter:
        asString(raw.manifestoFooter) || HOMEPAGE_DEFAULTS.manifestoFooter,
      quickActions:
        quickActionsRaw.length > 0
          ? quickActionsRaw
          : HOMEPAGE_DEFAULTS.quickActions,
      closingCta: {
        kicker:
          asString(closingRaw.kicker) || HOMEPAGE_DEFAULTS.closingCta.kicker,
        headlineLead:
          asString(closingRaw.headlineLead) ||
          HOMEPAGE_DEFAULTS.closingCta.headlineLead,
        headlineTail:
          asString(closingRaw.headlineTail) ||
          HOMEPAGE_DEFAULTS.closingCta.headlineTail,
        ctas:
          closingCtas.length > 0
            ? closingCtas
            : HOMEPAGE_DEFAULTS.closingCta.ctas,
      },
      flagshipEventSlug: flagshipSlug,
      featuredClubSlugs: featuredClubsRaw,
      vaultStories: vaultStoriesRaw,
      tagline: asString(raw.tagline) || HOMEPAGE_DEFAULTS.tagline,
    };
    return out;
  },
);

// ─────────────── site settings ───────────────

export const getSiteSettings = cache(async (): Promise<SiteSettingsData> => {
  const payload = await payloadPromise;
  let raw: AnyDoc;
  try {
    raw = (await payload.findGlobal({
      slug: "site-settings",
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return SITE_SETTINGS_DEFAULTS;
  }
  const campusRaw = (raw.campus as AnyDoc | undefined) ?? {};
  const cats = Array.isArray(raw.grievanceCategories)
    ? (raw.grievanceCategories as AnyDoc[]).map((c) => ({
        value: asString(c.value),
        label: asString(c.label),
      }))
    : [];
  return {
    siteName: asString(raw.siteName) || SITE_SETTINGS_DEFAULTS.siteName,
    tagline: (raw.tagline as string | undefined) || undefined,
    contactEmail: (raw.contactEmail as string | undefined) || undefined,
    instagramUrl: (raw.instagramUrl as string | undefined) || undefined,
    linkedinUrl: (raw.linkedinUrl as string | undefined) || undefined,
    campus: {
      name: asString(campusRaw.name) || SITE_SETTINGS_DEFAULTS.campus.name,
      coordinates:
        asString(campusRaw.coordinates) ||
        SITE_SETTINGS_DEFAULTS.campus.coordinates,
      timezone:
        asString(campusRaw.timezone) || SITE_SETTINGS_DEFAULTS.campus.timezone,
      timezoneAbbr:
        asString(campusRaw.timezoneAbbr) ||
        SITE_SETTINGS_DEFAULTS.campus.timezoneAbbr,
    },
    grievanceCategories:
      cats.length > 0 ? cats : SITE_SETTINGS_DEFAULTS.grievanceCategories,
    grievanceMailTo:
      asString(raw.grievanceMailTo) ||
      SITE_SETTINGS_DEFAULTS.grievanceMailTo,
  };
});

// ─────────────── faqs ───────────────

export const getFaqs = cache(
  async (page?: FaqItem["page"]): Promise<FaqItem[]> => {
    const payload = await payloadPromise;
    const r = await payload.find({
      collection: "faqs",
      where: page ? { page: { equals: page } } : undefined,
      limit: 200,
      sort: "order",
      overrideAccess: true,
    });
    return r.docs.map((d: AnyDoc) => ({
      id: asString(d.id),
      question: asString(d.question),
      answer: lexicalToText(d.answer),
      page: asString(d.page) as FaqItem["page"],
      order: typeof d.order === "number" ? d.order : 99,
    }));
  },
);
