import { z } from "zod";

export const announcementSchema = z.object({
  id: z.string(),
  title: z.string(),
  href: z.string().url().optional(),
  date: z.string(),
  pinned: z.boolean().default(false),
});
export type Announcement = z.infer<typeof announcementSchema>;

/**
 * Two kinds of council member, which drive two different layouts on /council:
 * the president gets a full-width takeover to themselves, everyone else gets a
 * card in the member grid. `isPresident` predates this and is kept in sync by
 * the panel so a rollback stays a plain `git revert`.
 */
export const councilMemberTypeSchema = z.enum(["president", "member"]);
export type CouncilMemberType = z.infer<typeof councilMemberTypeSchema>;

/** Card footprint for a group's members. Drives padding + type scale. */
export const councilCardSizeSchema = z.enum(["sm", "md", "lg"]);
export type CouncilCardSize = z.infer<typeof councilCardSizeSchema>;

/**
 * How a group lays its members out: a wrapping grid, or a single
 * horizontally-scrolling row (used for the long club-presidents list).
 */
export const councilGroupLayoutSchema = z.enum(["grid", "hscroll"]);
export type CouncilGroupLayout = z.infer<typeof councilGroupLayoutSchema>;

/**
 * A section of the council page — "The Board", "Core Team", "SCFC", … A group
 * with a `parentId` is a sub-group rendered under its parent's heading, which is
 * how the Board shows 3 large VP cards followed by 4 smaller officer cards
 * without becoming two separate sections.
 */
export const councilGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  blurb: z.string().optional(),
  parentId: z.string().optional(),
  perRow: z.number().min(1).max(6).default(4),
  cardSize: councilCardSizeSchema.default("md"),
  layout: councilGroupLayoutSchema.default("grid"),
  order: z.number().default(99),
});
export type CouncilGroup = z.infer<typeof councilGroupSchema>;

export const councilMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  program: z.string(),
  photo: z.string(),
  email: z.string().email().optional(),
  linkedin: z.string().url().optional(),
  // Long-form: only set on the President, used in the hero quote
  message: z.string().optional(),
  // Short one-line statement, shown under the member's photo on their card
  quote: z.string().optional(),
  memberType: councilMemberTypeSchema.default("member"),
  groupId: z.string().optional(),
  isPresident: z.boolean().default(false),
  featured: z.boolean().default(false),
  order: z.number().default(99),
});
export type CouncilMember = z.infer<typeof councilMemberSchema>;

export const eventCategorySchema = z.enum([
  "tech",
  "cultural",
  "sports",
  "flagship",
  "academic",
]);
export type EventCategory = z.infer<typeof eventCategorySchema>;

export const eventSchema = z.object({
  id: z.number().optional(),
  slug: z.string(),
  title: z.string(),
  category: eventCategorySchema,
  date: z.string(),
  endDate: z.string().optional(),
  venue: z.string(),
  banner: z.string(),
  excerpt: z.string(),
  description: z.string(),
  videoUrl: z.string().url().optional(),
  registrationUrl: z.string().url().optional(),
  attendees: z.number().optional(),
  featured: z.boolean().default(false),
  // Native registration / ticketing (managed in the portal).
  registrationEnabled: z.boolean().default(false),
  priceInPaise: z.number().default(0),
  capacity: z.number().optional(),
});
export type EventItem = z.infer<typeof eventSchema>;

/**
 * A heading on /clubs. Categories used to be a hardcoded tag-matching table in
 * clubs-explorer.tsx; they are now rows so the panel can rename, reorder and
 * reassign them without a deploy.
 */
export const clubCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  blurb: z.string().optional(),
  order: z.number().default(99),
});
export type ClubCategory = z.infer<typeof clubCategorySchema>;

export const clubSchema = z.object({
  slug: z.string(),
  name: z.string(),
  logo: z.string(),
  blurb: z.string(),
  joinUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  members: z.number().optional(),
  categoryId: z.string().optional(),
});
export type Club = z.infer<typeof clubSchema>;

export const supportChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  purpose: z.string(),
  description: z.string(),
  icon: z.string(),
  // Where on campus / which official office actually owns this
  ownedBy: z.string(),
  // What to bring / prepare before walking in
  bring: z.array(z.string()).default([]),
  // How the council can help — we don't own these channels
  councilRole: z.string(),
});
export type SupportChannel = z.infer<typeof supportChannelSchema>;

export const highlightSchema = z.object({
  id: z.string(),
  src: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
  span: z.enum(["sm", "md", "lg", "xl"]).default("md"),
});
export type Highlight = z.infer<typeof highlightSchema>;

// ────────────── Homepage config (CMS-driven) ──────────────

export type CtaVariant = "primary" | "outline" | "ghost";

export interface HomepageCta {
  label: string;
  href: string;
  variant: CtaVariant;
}

export interface HomepageHero {
  kicker: string;
  headline: string;
  sublineLead: string;
  sublineWords: string[];
  subParagraph: string;
  ctas: HomepageCta[];
  marqueeText: string;
}

export interface HomepageStat {
  value: number;
  suffix?: string;
  displayValue?: string;
  label: string;
}

export interface ManifestoLine {
  lead: string;
  tail: string;
}

export interface QuickAction {
  icon: string;
  title: string;
  body: string;
  href: string;
}

export interface ClosingCta {
  kicker: string;
  headlineLead: string;
  headlineTail: string;
  ctas: HomepageCta[];
}

export interface VaultStory {
  id: string;
  title: string;
  kicker: string;
  blurb: string;
  posterImage: string;
  videoUrl?: string;
  href: string;
  publishedAt?: string;
}

export interface HomepageConfigData {
  hero: HomepageHero;
  statsKicker: string;
  stats: HomepageStat[];
  manifestoKicker: string;
  manifestoLines: ManifestoLine[];
  manifestoFooter: string;
  quickActions: QuickAction[];
  closingCta: ClosingCta;
  flagshipEventSlug?: string;
  featuredClubSlugs: string[];
  vaultStories: VaultStory[];
  tagline: string;
}

// ────────────── Site settings ──────────────

export interface CampusSettings {
  name: string;
  coordinates: string;
  timezone: string;
  timezoneAbbr: string;
}

export interface GrievanceCategory {
  value: string;
  label: string;
}

export interface SiteSettingsData {
  siteName: string;
  tagline?: string;
  contactEmail?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  campus: CampusSettings;
  grievanceCategories: GrievanceCategory[];
  grievanceMailTo: string;
}

// ────────────── FAQs ──────────────

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  page: "council" | "support" | "clubs" | "events";
  order: number;
}
