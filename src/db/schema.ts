/**
 * Drizzle schema for the custom management portal.
 *
 * IMPORTANT — table naming: every table is prefixed `mp_` so these tables can
 * live in the SAME Turso/libSQL database alongside Payload's existing tables
 * (`users`, `events`, `media`, …) without collision. This is the "dual-read"
 * strategy: Payload's tables are never touched, so rollback is `git revert`.
 *
 * Design decisions (see plan):
 *  - Integer autoincrement PKs mirror Payload's IDs so the one-time data copy
 *    preserves foreign-key integers. New (registration/attendee) tables use
 *    text UUID PKs.
 *  - Globals (`homepage_config`, `site_settings`) are single-row typed tables
 *    (enforced id = 1), not key/value blobs.
 *  - Array / nested fields are JSON columns (`text { mode: "json" }`), not
 *    child tables — we own the reader + writer and the public site already
 *    consumes plain JS arrays.
 *  - Enums are text columns narrowed with `$type<>()`, reusing the unions
 *    already defined in `src/lib/schemas.ts`.
 */
import { sql } from "drizzle-orm";
import type { CompetitionResult } from "@/lib/sports-results";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

import type {
  CampusSettings,
  ClosingCta,
  CouncilCardSize,
  CouncilGroupLayout,
  CouncilMemberType,
  EventCategory,
  GrievanceCategory,
  HomepageHero,
  HomepageStat,
  ManifestoLine,
  QuickAction,
  VaultStoryConfig,
} from "@/lib/schemas";
import type {
  SportType,
  SportDivision,
  SportCompetitionStatus,
  SportMatchStatus,
  SportPersonRole,
} from "@/lib/schemas";

// ─────────────────────────── shared column helpers ───────────────────────────

const createdAt = text("created_at")
  .notNull()
  .default(sql`CURRENT_TIMESTAMP`);
const updatedAt = text("updated_at")
  .notNull()
  .default(sql`CURRENT_TIMESTAMP`);

export type UserRole =
  | "super_admin"
  | "operations"
  | "admin"
  | "sports_lead"
  | "food_committee_member"
  | "council_member"
  | "club_lead"
  | "editor"
  | "viewer";

export type EventStatus = "draft" | "pending_review" | "published" | "archived";

export type ClubMembershipRole = "president" | "member";
export type RevisionEntityType = "club_page" | "event" | "event_followup";
export type RevisionStatus =
  | "draft"
  | "pending_review"
  | "changes_requested"
  | "approved"
  | "declined"
  | "withdrawn";
export type ClubPageTemplate = "stage" | "zine" | "clubhouse";
export type ClubTypographyPreset = "signal" | "editorial" | "friendly";
export type ClubPageTheme = {
  background: string;
  foreground: string;
  accent: string;
  logoTreatment: "natural" | "badge" | "monochrome";
};
export type ClubPageSection =
  | "about"
  | "activities"
  | "videos"
  | "events"
  | "gallery"
  | "people";
export type ClubSectionHeadings = Partial<Record<ClubPageSection, string>>;

export type RegistrationStatus = "pending" | "confirmed" | "cancelled";
export type PaymentStatus = "none" | "created" | "paid" | "failed" | "refunded";

export type RecapGalleryItem = { url: string; caption?: string };
export type RecapStat = { label: string; value: string };

/** One "what we run" row on a club page. */
export type ClubActivity = { title: string; description?: string };
/** One entry in a club's video list. Any YouTube/Vimeo URL form is accepted. */
export type ClubVideo = { url: string; title?: string };
export type ClubGallerySize = "small" | "medium" | "large";
/** A club photo plus its authored prominence in the public gallery. */
export type ClubGalleryItem = {
  url: string;
  caption?: string;
  size?: ClubGallerySize;
  mediaId?: number;
};

// ──────────────────────────────── sports ─────────────────────────────────────
// JSON-column shapes for the sports tables. Enums (SportType, SportDivision,
// …) are imported from src/lib/schemas; these row/shape types are defined here
// for the DB layer and duplicated in schemas.ts for the zod validation layer.

/** One row in a league's standings table. */
export type SportStandingRow = {
  position?: number;
  teamId?: number;
  teamName?: string; // denormalised so standings render without a join
  played: number;
  won: number;
  lost: number;
  drawn: number;
  points: number;
};

/** One timestamped event in a live match feed (goal, card, substitution, …). */
export type SportMatchEvent = {
  time: string; // e.g. "23'" or "Q2 4:30"
  team: "a" | "b";
  type: string; // "goal" | "yellow" | "red" | "sub" | "timeout" | "point" | …
  description?: string;
};

/** A post-match highlight photo or video thumbnail. */
export type SportPostMatchHighlight = {
  url: string;
  caption?: string;
};

/** A post-match interview link. */
export type SportPostMatchInterview = {
  title: string;
  videoUrl?: string;
  url?: string;
};

/** Post-match content attached to a match (highlights, interviews, winner). */
export type SportPostMatch = {
  highlights?: SportPostMatchHighlight[];
  interviews?: SportPostMatchInterview[];
  winnerName?: string;
  winnerTitle?: string;
  winnerPhotoId?: number;
  runnerUpName?: string;
  runnerUpPhotoId?: number;
};

// ───────────────────────────────── Oval menu ─────────────────────────────────

export type OvalDiet = "veg" | "egg" | "nonveg";
export type OvalMealId =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "jain_lunch"
  | "jain_dinner";
export type OvalDayStatus = "draft" | "approved";
export type OvalImportMethod = "manual" | "spreadsheet" | "ocr";

export type OvalMenuItem = {
  id: string;
  category: string;
  dish: string;
  diets: OvalDiet[];
  confidence: number;
  needsReview: boolean;
  sourceText?: string;
};

export type OvalMeals = Record<OvalMealId, OvalMenuItem[]>;

// ─────────────────────────────────── users ───────────────────────────────────
// clubId <-> clubs.leadId is a circular reference; both kept as plain integer
// columns (no hard FK) and wired through `relations()` to avoid SQLite
// circular-FK creation-order headaches.

export const users = sqliteTable(
  "mp_users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    // bcrypt hash. Nullable so a row can exist pre-password (invited users).
    password: text("password"),
    role: text("role").$type<UserRole>().notNull().default("viewer"),
    clubId: integer("club_id"),
    mustChangePassword: integer("must_change_password", { mode: "boolean" })
      .notNull()
      .default(false),
    phone: text("phone"),
    // Optimistic lockout fields (Phase 4 rate-limiting).
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: text("locked_until"),
    createdAt,
    updatedAt,
  },
  (t) => ({
    emailIdx: uniqueIndex("mp_users_email_idx").on(t.email),
  }),
);

// ─────────────────────────────────── media ───────────────────────────────────

export const media = sqliteTable("mp_media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  alt: text("alt").notNull(),
  // Full public R2 URL (mirrors how Payload stored it).
  url: text("url").notNull(),
  filename: text("filename"),
  mimeType: text("mime_type"),
  filesize: integer("filesize"),
  width: integer("width"),
  height: integer("height"),
  credit: text("credit"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  createdAt,
  updatedAt,
});

// ─────────────────────────────────── clubs ───────────────────────────────────

/**
 * The headings on /clubs. Previously a hardcoded array in the explorer that
 * bucketed clubs by their first matching tag; now a table so categories can be
 * renamed, reordered and reassigned from the panel. `tags` stays as free-form
 * keywords — the category is the one authoritative grouping.
 */
export const clubCategories = sqliteTable(
  "mp_club_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    blurb: text("blurb"),
    sortOrder: integer("sort_order").notNull().default(99),
    createdAt,
    updatedAt,
  },
  (t) => ({
    slugIdx: uniqueIndex("mp_club_categories_slug_idx").on(t.slug),
  }),
);

export const clubs = sqliteTable(
  "mp_clubs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logoId: integer("logo_id").references(() => media.id),
    blurb: text("blurb").notNull(),
    joinUrl: text("join_url"),
    tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
    members: integer("members"),
    categoryId: integer("category_id").references(() => clubCategories.id),
    leadId: integer("lead_id"), // -> users.id (circular; via relations)
    // ── /clubs/[slug] detail-page content ──
    // All optional: a club that fills none of this still renders a valid page,
    // it just shows fewer sections (the page numbers its sections from what is
    // actually present, so a sparse club never shows gaps).
    tagline: text("tagline"),
    about: text("about"), // long-form "what we do"
    coverId: integer("cover_id").references(() => media.id),
    // #RRGGBB. Per-club colour. Disabled on the public site for now.
    // ALWAYS re-validate on read as well as write.
    accentColor: text("accent_color"),
    foundedYear: integer("founded_year"),
    activities: text("activities", { mode: "json" })
      .$type<ClubActivity[]>()
      .default([]),
    flagshipEvent: text("flagship_event"),
    videos: text("videos", { mode: "json" }).$type<ClubVideo[]>().default([]),
    gallery: text("gallery", { mode: "json" })
      .$type<ClubGalleryItem[]>()
      .default([]),
    instagramUrl: text("instagram_url"),
    linkedinUrl: text("linkedin_url"),
    websiteUrl: text("website_url"),
    contactEmail: text("contact_email"),
    // Approved public-page configuration. Null template means the club keeps
    // the incumbent renderer until its first template revision is approved.
    pageTemplate: text("page_template").$type<ClubPageTemplate>(),
    pageTheme: text("page_theme", { mode: "json" }).$type<ClubPageTheme>(),
    pageVisibleSections: text("page_visible_sections", { mode: "json" }).$type<
      ClubPageSection[]
    >(),
    pageSectionHeadings: text("page_section_headings", {
      mode: "json",
    }).$type<ClubSectionHeadings>(),
    pageTypography: text("page_typography").$type<ClubTypographyPreset>(),
    version: integer("version").notNull().default(1),
    createdAt,
    updatedAt,
  },
  (t) => ({
    slugIdx: uniqueIndex("mp_clubs_slug_idx").on(t.slug),
    nameIdx: uniqueIndex("mp_clubs_name_idx").on(t.name),
  }),
);

// ─────────────────────────────────── events ──────────────────────────────────

export const events = sqliteTable(
  "mp_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    status: text("status").$type<EventStatus>().notNull().default("draft"),
    category: text("category").$type<EventCategory>().notNull(),
    date: text("date").notNull(), // ISO string
    endDate: text("end_date"),
    venue: text("venue").notNull(),
    excerpt: text("excerpt").notNull(),
    description: text("description").default(""), // markdown
    bannerId: integer("banner_id").references(() => media.id),
    videoUrl: text("video_url"),
    registrationUrl: text("registration_url"), // external RSVP (legacy/optional)
    attendees: integer("attendees"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    organizerId: integer("organizer_id").references(() => users.id),
    clubId: integer("club_id").references(() => clubs.id),
    // Native registration / ticketing (Phase 5). Harmless defaults until then.
    registrationEnabled: integer("registration_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    priceInPaise: integer("price_in_paise").notNull().default(0),
    capacity: integer("capacity"),
    publishedAt: text("published_at"),
    version: integer("version").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (t) => ({
    slugIdx: uniqueIndex("mp_events_slug_idx").on(t.slug),
    statusIdx: index("mp_events_status_idx").on(t.status),
    dateIdx: index("mp_events_date_idx").on(t.date),
    categoryIdx: index("mp_events_category_idx").on(t.category),
  }),
);

/**
 * Every club publicly associated with an event. `mp_events.club_id` remains
 * the primary/legacy club during the migration window; this table is the
 * authoritative list of hosts and supports co-hosted events.
 */
export const eventClubs = sqliteTable(
  "mp_event_clubs",
  {
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    clubId: integer("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    createdAt,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.eventId, t.clubId] }),
    clubIdx: index("mp_event_clubs_club_idx").on(t.clubId),
  }),
);

// ─────────────────────────────────── recaps ──────────────────────────────────

export const recaps = sqliteTable(
  "mp_recaps",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    eventId: integer("event_id").references(() => events.id),
    kicker: text("kicker"),
    blurb: text("blurb"),
    publishedAt: text("published_at"),
    heroMediaId: integer("hero_media_id").references(() => media.id),
    heroVideoUrl: text("hero_video_url"),
    gallery: text("gallery", { mode: "json" })
      .$type<RecapGalleryItem[]>()
      .default([]),
    stats: text("stats", { mode: "json" }).$type<RecapStat[]>().default([]),
    status: text("status")
      .$type<"draft" | "published">()
      .notNull()
      .default("draft"),
    version: integer("version").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (t) => ({
    slugIdx: uniqueIndex("mp_recaps_slug_idx").on(t.slug),
  }),
);

// ───────────────────── club access + content approvals ─────────────────────

export const clubMemberships = sqliteTable(
  "mp_club_memberships",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    clubId: integer("club_id")
      .notNull()
      .references(() => clubs.id),
    membershipRole: text("membership_role")
      .$type<ClubMembershipRole>()
      .notNull()
      .default("member"),
    canEditPage: integer("can_edit_page", { mode: "boolean" })
      .notNull()
      .default(false),
    canManageEvents: integer("can_manage_events", { mode: "boolean" })
      .notNull()
      .default(false),
    canManageMedia: integer("can_manage_media", { mode: "boolean" })
      .notNull()
      .default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    invitedByUserId: integer("invited_by_user_id").references(() => users.id),
    revokedByUserId: integer("revoked_by_user_id").references(() => users.id),
    revokedAt: text("revoked_at"),
    createdAt,
    updatedAt,
  },
  (t) => ({
    userClubIdx: uniqueIndex("mp_club_memberships_user_club_idx").on(
      t.userId,
      t.clubId,
    ),
    clubIdx: index("mp_club_memberships_club_idx").on(t.clubId),
    userIdx: index("mp_club_memberships_user_idx").on(t.userId),
  }),
);

export const contentRevisions = sqliteTable(
  "mp_content_revisions",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").$type<RevisionEntityType>().notNull(),
    entityId: integer("entity_id").notNull(),
    clubId: integer("club_id")
      .notNull()
      .references(() => clubs.id),
    status: text("status").$type<RevisionStatus>().notNull().default("draft"),
    snapshot: text("snapshot", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    baseVersion: integer("base_version").notNull(),
    authorUserId: integer("author_user_id")
      .notNull()
      .references(() => users.id),
    submittedAt: text("submitted_at"),
    reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id),
    reviewedAt: text("reviewed_at"),
    reviewNote: text("review_note"),
    supersedesRevisionId: text("supersedes_revision_id"),
    createdAt,
    updatedAt,
  },
  (t) => ({
    entityIdx: index("mp_content_revisions_entity_idx").on(
      t.entityType,
      t.entityId,
    ),
    clubIdx: index("mp_content_revisions_club_idx").on(t.clubId),
    statusIdx: index("mp_content_revisions_status_idx").on(t.status),
    submittedIdx: index("mp_content_revisions_submitted_idx").on(t.submittedAt),
  }),
);

export const eventFollowupTasks = sqliteTable(
  "mp_event_followup_tasks",
  {
    id: text("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    clubId: integer("club_id")
      .notNull()
      .references(() => clubs.id),
    status: text("status")
      .$type<"open" | "completed">()
      .notNull()
      .default("open"),
    completedAt: text("completed_at"),
    createdAt,
    updatedAt,
  },
  (t) => ({
    eventIdx: uniqueIndex("mp_event_followup_tasks_event_idx").on(t.eventId),
    clubStatusIdx: index("mp_event_followup_tasks_club_status_idx").on(
      t.clubId,
      t.status,
    ),
  }),
);

// ─────────────────────────────── announcements ───────────────────────────────

export const announcements = sqliteTable(
  "mp_announcements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    href: text("href"),
    date: text("date").notNull(),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    // Set when auto-created by the publish-automation, for dedupe.
    eventId: integer("event_id").references(() => events.id),
    createdAt,
    updatedAt,
  },
  (t) => ({
    dateIdx: index("mp_announcements_date_idx").on(t.date),
    pinnedIdx: index("mp_announcements_pinned_idx").on(t.pinned),
  }),
);

// ──────────────────────────────── highlights ─────────────────────────────────

export const highlights = sqliteTable("mp_highlights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  imageId: integer("image_id").references(() => media.id),
  alt: text("alt").notNull(),
  caption: text("caption"),
  span: text("span").$type<"sm" | "md" | "lg" | "xl">().notNull().default("md"),
  sortOrder: integer("sort_order").notNull().default(99),
  createdAt,
  updatedAt,
});

// ──────────────────────────────────── faqs ───────────────────────────────────

export const faqs = sqliteTable("mp_faqs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  question: text("question").notNull(),
  answer: text("answer").default(""), // markdown
  page: text("page")
    .$type<"council" | "support" | "clubs" | "events">()
    .notNull()
    .default("council"),
  sortOrder: integer("sort_order").notNull().default(99),
  createdAt,
  updatedAt,
});

// ──────────────────────────────── council groups ─────────────────────────────
// Sections of the /council page ("The Board", "Core Team", "SCFC", …). A row
// with a `parentId` is a SUB-group rendered under its parent's heading — that's
// how the Board shows 3 large VP cards and then 4 smaller officer cards while
// staying one section. Self-referencing FK, so the column needs the explicit
// AnySQLiteColumn return type.

export const councilGroups = sqliteTable("mp_council_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  blurb: text("blurb"),
  parentId: integer("parent_id").references(
    (): AnySQLiteColumn => councilGroups.id,
  ),
  // How many cards per row on desktop (1-6); narrower breakpoints step down.
  perRow: integer("per_row").notNull().default(4),
  cardSize: text("card_size").$type<CouncilCardSize>().notNull().default("md"),
  layout: text("layout").$type<CouncilGroupLayout>().notNull().default("grid"),
  sortOrder: integer("sort_order").notNull().default(99),
  createdAt,
  updatedAt,
});

// ──────────────────────────────── council members ────────────────────────────

export const councilMembers = sqliteTable("mp_council_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  program: text("program").notNull(),
  photoId: integer("photo_id").references(() => media.id),
  email: text("email"),
  linkedin: text("linkedin"),
  message: text("message"),
  quote: text("quote"),
  // Long-form "what this role is and what they do", shown in the expanded card.
  bio: text("bio"),
  // Layout tier: "president" gets the full-width takeover, "member" gets a card
  // in the grid, "co_lead" gets no grid card and appears only inside their
  // lead's expanded card. `isPresident` predates this column and is written in
  // sync by the panel (see council/actions.ts) so a rollback stays a `git revert`.
  memberType: text("member_type")
    .$type<CouncilMemberType>()
    .notNull()
    .default("member"),
  // Which section of /council this member appears in. Null means the profile is
  // not shown there; club-linked profiles can still appear on their club page.
  groupId: integer("group_id").references(() => councilGroups.id),
  // Which club this member runs, if any. Lets /clubs/[slug] show its leads with
  // photo/role/program/LinkedIn without duplicating any of that onto mp_clubs —
  // `clubs.leadId -> users` stays the RBAC link (mp_users has no photo).
  clubId: integer("club_id").references(() => clubs.id),
  isPresident: integer("is_president", { mode: "boolean" })
    .notNull()
    .default(false),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(99),
  createdAt,
  updatedAt,
});

// ──────────────────────────────── support channels ───────────────────────────

export const supportChannels = sqliteTable("mp_support_channels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  purpose: text("purpose").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("LifeBuoy"),
  ownedBy: text("owned_by").notNull(),
  bring: text("bring", { mode: "json" }).$type<string[]>().default([]),
  councilRole: text("council_role").notNull(),
  createdAt,
  updatedAt,
});

// ──────────────────────────── globals (single-row) ───────────────────────────

export const homepageConfig = sqliteTable("mp_homepage_config", {
  id: integer("id").primaryKey({ autoIncrement: true }), // enforce id = 1
  hero: text("hero", { mode: "json" }).$type<HomepageHero>(),
  statsKicker: text("stats_kicker"),
  stats: text("stats", { mode: "json" }).$type<HomepageStat[]>().default([]),
  manifestoKicker: text("manifesto_kicker"),
  manifestoLines: text("manifesto_lines", { mode: "json" })
    .$type<ManifestoLine[]>()
    .default([]),
  manifestoFooter: text("manifesto_footer"),
  quickActions: text("quick_actions", { mode: "json" })
    .$type<QuickAction[]>()
    .default([]),
  closingCta: text("closing_cta", { mode: "json" }).$type<ClosingCta>(),
  flagshipEventId: integer("flagship_event_id").references(() => events.id),
  featuredClubIds: text("featured_club_ids", { mode: "json" })
    .$type<number[]>()
    .default([]),
  vaultStoryIds: text("vault_story_ids", { mode: "json" })
    .$type<number[]>()
    .default([]),
  // Custom vault stories — full editorial control (video URL, text, media
  // kind) independent of the recaps table. When populated, these override the
  // recap-based vaultStoryIds above.
  vaultStories: text("vault_stories", { mode: "json" })
    .$type<VaultStoryConfig[]>()
    .default([]),
  tagline: text("tagline"),
  updatedAt,
});

export const siteSettings = sqliteTable("mp_site_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }), // enforce id = 1
  siteName: text("site_name").notNull().default("Woxsen Student Council"),
  tagline: text("tagline"),
  councilGroupPhotoId: integer("council_group_photo_id").references(
    () => media.id,
  ),
  contactEmail: text("contact_email"),
  instagramUrl: text("instagram_url"),
  linkedinUrl: text("linkedin_url"),
  campus: text("campus", { mode: "json" }).$type<CampusSettings>(),
  grievanceCategories: text("grievance_categories", { mode: "json" })
    .$type<GrievanceCategory[]>()
    .default([]),
  grievanceMailTo: text("grievance_mail_to"),
  updatedAt,
});

// ───────────────── registrations + attendees (Phase 5, UUID PKs) ──────────────

export const eventRegistrations = sqliteTable(
  "mp_event_registrations",
  {
    id: text("id").primaryKey(), // UUID
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    status: text("status")
      .$type<RegistrationStatus>()
      .notNull()
      .default("pending"),
    amountInPaise: integer("amount_in_paise").notNull().default(0),
    currency: text("currency").notNull().default("INR"),
    razorpayOrderId: text("razorpay_order_id"),
    razorpayPaymentId: text("razorpay_payment_id"),
    razorpaySignature: text("razorpay_signature"),
    paymentStatus: text("payment_status")
      .$type<PaymentStatus>()
      .notNull()
      .default("none"),
    meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt,
    updatedAt,
  },
  (t) => ({
    eventIdx: index("mp_registrations_event_idx").on(t.eventId),
    paymentIdx: uniqueIndex("mp_registrations_payment_idx").on(
      t.razorpayPaymentId,
    ),
  }),
);

export const attendees = sqliteTable(
  "mp_attendees",
  {
    id: text("id").primaryKey(), // UUID
    registrationId: text("registration_id")
      .notNull()
      .references(() => eventRegistrations.id),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    ticketCode: text("ticket_code").notNull(),
    checkedInAt: text("checked_in_at"),
    checkedInByUserId: integer("checked_in_by_user_id").references(
      () => users.id,
    ),
    // Which check-in station/gate stamped this attendee (multi-gate attribution).
    checkedInGate: text("checked_in_gate"),
    createdAt,
    // Nullable (no CURRENT_TIMESTAMP default): SQLite forbids a non-constant
    // default on ADD COLUMN, and pre-existing attendee rows have no update time.
    // Writers stamp this explicitly on check-in.
    updatedAt: text("updated_at"),
  },
  (t) => ({
    ticketIdx: uniqueIndex("mp_attendees_ticket_idx").on(t.ticketCode),
    eventIdx: index("mp_attendees_event_idx").on(t.eventId),
  }),
);

// ─────────────── notifications (delivery outbox) ───────────────
// Persisted so a ticket send is never silently lost: best-effort on the request
// path, retried by a flush job. Phase 1 records "ticket issued"; Phase 2 adds
// email delivery on top of the same rows.

export type NotificationChannel = "email" | "system";
export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";

export const notifications = sqliteTable(
  "mp_notifications",
  {
    id: text("id").primaryKey(), // UUID
    registrationId: text("registration_id").references(
      () => eventRegistrations.id,
    ),
    channel: text("channel")
      .$type<NotificationChannel>()
      .notNull()
      .default("system"),
    template: text("template").notNull(),
    status: text("status")
      .$type<NotificationStatus>()
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt,
    updatedAt,
  },
  (t) => ({
    statusIdx: index("mp_notifications_status_idx").on(t.status),
    regIdx: index("mp_notifications_reg_idx").on(t.registrationId),
  }),
);

// ─────────────── audit log (ops accountability) ───────────────
// Every consequential cockpit action (check-in, manual add, cancel, refund,
// resend) writes one row → powers the per-event activity feed.

export const auditLog = sqliteTable(
  "mp_audit_log",
  {
    id: text("id").primaryKey(), // UUID
    actorUserId: integer("actor_user_id").references(() => users.id),
    eventId: integer("event_id").references(() => events.id),
    clubId: integer("club_id").references(() => clubs.id),
    revisionId: text("revision_id"),
    action: text("action").notNull(),
    targetId: text("target_id"),
    meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt,
  },
  (t) => ({
    eventIdx: index("mp_audit_event_idx").on(t.eventId),
    createdIdx: index("mp_audit_created_idx").on(t.createdAt),
  }),
);

// ──────────────────────────────── sports ────────────────────────────────────
// The sports vertical: tournaments, leagues, teams, matches, people (alumni +
// reps), and a single-row page config. Matches belong to either a tournament
// or a league (both nullable — a friendly doesn't need a parent). Live scoring
// is per-match: status "live" + scoreA/scoreB + a JSON event feed.

export const sportsTournaments = sqliteTable(
  "mp_sports_tournaments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    result: text("result", { mode: "json" }).$type<CompetitionResult>(),
    slug: text("slug").notNull(),
    status: text("status")
      .$type<SportCompetitionStatus>()
      .notNull()
      .default("draft"),
    sport: text("sport").$type<SportType>().notNull(),
    year: integer("year").notNull(),
    division: text("division").$type<SportDivision>().notNull().default("open"),
    venue: text("venue"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    bannerId: integer("banner_id").references(() => media.id),
    excerpt: text("excerpt").default(""),
    description: text("description").default(""), // markdown
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    publishedAt: text("published_at"),
    createdAt,
    updatedAt,
  },
  (t) => ({
    slugIdx: uniqueIndex("mp_sports_tournaments_slug_idx").on(t.slug),
    yearIdx: index("mp_sports_tournaments_year_idx").on(t.year),
    sportIdx: index("mp_sports_tournaments_sport_idx").on(t.sport),
    statusIdx: index("mp_sports_tournaments_status_idx").on(t.status),
  }),
);

export const sportsLeagues = sqliteTable(
  "mp_sports_leagues",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    result: text("result", { mode: "json" }).$type<CompetitionResult>(),
    slug: text("slug").notNull(),
    status: text("status")
      .$type<SportCompetitionStatus>()
      .notNull()
      .default("draft"),
    sport: text("sport").$type<SportType>().notNull(),
    year: integer("year").notNull(),
    division: text("division").$type<SportDivision>().notNull().default("open"),
    venue: text("venue"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    bannerId: integer("banner_id").references(() => media.id),
    excerpt: text("excerpt").default(""),
    description: text("description").default(""), // markdown
    // League standings table — JSON array, edited in the panel via RepeaterField.
    standings: text("standings", { mode: "json" })
      .$type<SportStandingRow[]>()
      .default([]),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    publishedAt: text("published_at"),
    createdAt,
    updatedAt,
  },
  (t) => ({
    slugIdx: uniqueIndex("mp_sports_leagues_slug_idx").on(t.slug),
    yearIdx: index("mp_sports_leagues_year_idx").on(t.year),
    sportIdx: index("mp_sports_leagues_sport_idx").on(t.sport),
    statusIdx: index("mp_sports_leagues_status_idx").on(t.status),
  }),
);

export const sportsTeams = sqliteTable(
  "mp_sports_teams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logoId: integer("logo_id").references(() => media.id),
    // Optional link to a club (sports clubs), so a team can be "the football club's team"
    // or a standalone ad-hoc team (house team, inter-class team).
    clubId: integer("club_id").references(() => clubs.id),
    createdAt,
    updatedAt,
  },
  (t) => ({
    slugIdx: uniqueIndex("mp_sports_teams_slug_idx").on(t.slug),
    clubIdx: index("mp_sports_teams_club_idx").on(t.clubId),
  }),
);

export const sportsMatches = sqliteTable(
  "mp_sports_matches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // A match belongs to a tournament OR a league (or neither for a friendly).
    tournamentId: integer("tournament_id").references(
      () => sportsTournaments.id,
    ),
    leagueId: integer("league_id").references(() => sportsLeagues.id),
    sport: text("sport").$type<SportType>().notNull(),
    round: text("round"), // "Group A", "Quarterfinal", "Matchday 3", …
    participantType: text("participant_type")
      .$type<"teams" | "people">()
      .notNull()
      .default("teams"),
    participantAName: text("participant_a_name"),
    participantBName: text("participant_b_name"),
    teamAId: integer("team_a_id").references(() => sportsTeams.id),
    teamBId: integer("team_b_id").references(() => sportsTeams.id),
    matchDate: text("match_date"),
    venue: text("venue"),
    status: text("status")
      .$type<SportMatchStatus>()
      .notNull()
      .default("scheduled"),
    scoreA: integer("score_a"),
    scoreB: integer("score_b"),
    // Live scoring event feed — appended to during a live match.
    events: text("events", { mode: "json" })
      .$type<SportMatchEvent[]>()
      .default([]),
    // Post-match content: highlights, interviews, winner info.
    postMatch: text("post_match", { mode: "json" })
      .$type<SportPostMatch>()
      .default({}),
    createdAt,
    updatedAt,
  },
  (t) => ({
    tournamentIdx: index("mp_sports_matches_tournament_idx").on(t.tournamentId),
    leagueIdx: index("mp_sports_matches_league_idx").on(t.leagueId),
    dateIdx: index("mp_sports_matches_date_idx").on(t.matchDate),
    statusIdx: index("mp_sports_matches_status_idx").on(t.status),
  }),
);

export const sportsPeople = sqliteTable(
  "mp_sports_people",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    photoId: integer("photo_id").references(() => media.id),
    role: text("role")
      .$type<SportPersonRole>()
      .notNull()
      .default("representative"),
    bio: text("bio"),
    graduationYear: integer("graduation_year"),
    sport: text("sport").$type<SportType>(),
    email: text("email"),
    phone: text("phone"),
    sortOrder: integer("sort_order").notNull().default(99),
    createdAt,
    updatedAt,
  },
  (t) => ({
    slugIdx: uniqueIndex("mp_sports_people_slug_idx").on(t.slug),
    roleIdx: index("mp_sports_people_role_idx").on(t.role),
  }),
);

// Single-row (id = 1) config for the /sports page — academy logo, tagline,
// and the managed set of gallery images that scroll in the top marquee.
export const sportsPageConfig = sqliteTable("mp_sports_page_config", {
  id: integer("id").primaryKey({ autoIncrement: true }), // enforce id = 1
  academyLogoId: integer("academy_logo_id").references(() => media.id),
  tagline: text("tagline").default(""),
  // Media IDs for the top gallery — resolved to URLs in the content getter.
  galleryImageIds: text("gallery_image_ids", { mode: "json" })
    .$type<number[]>()
    .default([]),
  createdAt,
  updatedAt,
});

// One authoritative record per service day. A weekly upload writes seven rows,
// but public reads always address exactly one approved date.
export const ovalMenuDays = sqliteTable(
  "mp_oval_menu_days",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    menuDate: text("menu_date").notNull(), // YYYY-MM-DD in Asia/Kolkata
    weekStart: text("week_start").notNull(), // Monday, YYYY-MM-DD
    status: text("status").$type<OvalDayStatus>().notNull().default("draft"),
    meals: text("meals", { mode: "json" })
      .$type<OvalMeals>()
      .notNull()
      .default({
        breakfast: [],
        lunch: [],
        dinner: [],
        jain_lunch: [],
        jain_dinner: [],
      }),
    sourceName: text("source_name"),
    sourceMimeType: text("source_mime_type"),
    importMethod: text("import_method")
      .$type<OvalImportMethod>()
      .notNull()
      .default("manual"),
    importedByUserId: integer("imported_by_user_id").references(() => users.id),
    approvedByUserId: integer("approved_by_user_id").references(() => users.id),
    approvedAt: text("approved_at"),
    createdAt,
    updatedAt,
  },
  (t) => ({
    dateIdx: uniqueIndex("mp_oval_menu_days_date_idx").on(t.menuDate),
    weekIdx: index("mp_oval_menu_days_week_idx").on(t.weekStart),
    statusIdx: index("mp_oval_menu_days_status_idx").on(t.status),
  }),
);

// ──────────────────────────────── relations ──────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  club: one(clubs, { fields: [users.clubId], references: [clubs.id] }),
  ledClubs: many(clubs),
  clubMemberships: many(clubMemberships),
}));

export const clubCategoriesRelations = relations(
  clubCategories,
  ({ many }) => ({
    clubs: many(clubs),
  }),
);

export const clubsRelations = relations(clubs, ({ one, many }) => ({
  logo: one(media, { fields: [clubs.logoId], references: [media.id] }),
  cover: one(media, { fields: [clubs.coverId], references: [media.id] }),
  lead: one(users, { fields: [clubs.leadId], references: [users.id] }),
  category: one(clubCategories, {
    fields: [clubs.categoryId],
    references: [clubCategories.id],
  }),
  events: many(events),
  hostedEvents: many(eventClubs),
  memberships: many(clubMemberships),
  revisions: many(contentRevisions),
  followupTasks: many(eventFollowupTasks),
}));

export const clubMembershipsRelations = relations(
  clubMemberships,
  ({ one }) => ({
    user: one(users, {
      fields: [clubMemberships.userId],
      references: [users.id],
    }),
    club: one(clubs, {
      fields: [clubMemberships.clubId],
      references: [clubs.id],
    }),
  }),
);

export const contentRevisionsRelations = relations(
  contentRevisions,
  ({ one }) => ({
    club: one(clubs, {
      fields: [contentRevisions.clubId],
      references: [clubs.id],
    }),
    author: one(users, {
      fields: [contentRevisions.authorUserId],
      references: [users.id],
      relationName: "revisionAuthor",
    }),
    reviewer: one(users, {
      fields: [contentRevisions.reviewedByUserId],
      references: [users.id],
      relationName: "revisionReviewer",
    }),
  }),
);

export const eventFollowupTasksRelations = relations(
  eventFollowupTasks,
  ({ one }) => ({
    event: one(events, {
      fields: [eventFollowupTasks.eventId],
      references: [events.id],
    }),
    club: one(clubs, {
      fields: [eventFollowupTasks.clubId],
      references: [clubs.id],
    }),
  }),
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  banner: one(media, { fields: [events.bannerId], references: [media.id] }),
  organizer: one(users, {
    fields: [events.organizerId],
    references: [users.id],
  }),
  club: one(clubs, { fields: [events.clubId], references: [clubs.id] }),
  hostingClubs: many(eventClubs),
  recaps: many(recaps),
  registrations: many(eventRegistrations),
}));

export const eventClubsRelations = relations(eventClubs, ({ one }) => ({
  event: one(events, {
    fields: [eventClubs.eventId],
    references: [events.id],
  }),
  club: one(clubs, {
    fields: [eventClubs.clubId],
    references: [clubs.id],
  }),
}));

export const recapsRelations = relations(recaps, ({ one }) => ({
  event: one(events, { fields: [recaps.eventId], references: [events.id] }),
  heroMedia: one(media, {
    fields: [recaps.heroMediaId],
    references: [media.id],
  }),
}));

export const councilGroupsRelations = relations(
  councilGroups,
  ({ one, many }) => ({
    parent: one(councilGroups, {
      relationName: "groupParent",
      fields: [councilGroups.parentId],
      references: [councilGroups.id],
    }),
    children: many(councilGroups, { relationName: "groupParent" }),
    members: many(councilMembers),
  }),
);

export const councilMembersRelations = relations(councilMembers, ({ one }) => ({
  photo: one(media, {
    fields: [councilMembers.photoId],
    references: [media.id],
  }),
  group: one(councilGroups, {
    fields: [councilMembers.groupId],
    references: [councilGroups.id],
  }),
}));

export const highlightsRelations = relations(highlights, ({ one }) => ({
  image: one(media, { fields: [highlights.imageId], references: [media.id] }),
}));

export const siteSettingsRelations = relations(siteSettings, ({ one }) => ({
  councilGroupPhoto: one(media, {
    fields: [siteSettings.councilGroupPhotoId],
    references: [media.id],
  }),
}));

export const registrationsRelations = relations(
  eventRegistrations,
  ({ one, many }) => ({
    event: one(events, {
      fields: [eventRegistrations.eventId],
      references: [events.id],
    }),
    attendees: many(attendees),
  }),
);

export const attendeesRelations = relations(attendees, ({ one }) => ({
  registration: one(eventRegistrations, {
    fields: [attendees.registrationId],
    references: [eventRegistrations.id],
  }),
  event: one(events, { fields: [attendees.eventId], references: [events.id] }),
  checkedInBy: one(users, {
    fields: [attendees.checkedInByUserId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  registration: one(eventRegistrations, {
    fields: [notifications.registrationId],
    references: [eventRegistrations.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(users, { fields: [auditLog.actorUserId], references: [users.id] }),
  event: one(events, { fields: [auditLog.eventId], references: [events.id] }),
  club: one(clubs, { fields: [auditLog.clubId], references: [clubs.id] }),
}));

// ──────────────────────────── sports relations ───────────────────────────────

export const sportsTournamentsRelations = relations(
  sportsTournaments,
  ({ one, many }) => ({
    banner: one(media, {
      fields: [sportsTournaments.bannerId],
      references: [media.id],
    }),
    matches: many(sportsMatches),
  }),
);

export const sportsLeaguesRelations = relations(
  sportsLeagues,
  ({ one, many }) => ({
    banner: one(media, {
      fields: [sportsLeagues.bannerId],
      references: [media.id],
    }),
    matches: many(sportsMatches),
  }),
);

export const sportsTeamsRelations = relations(sportsTeams, ({ one }) => ({
  logo: one(media, { fields: [sportsTeams.logoId], references: [media.id] }),
  club: one(clubs, { fields: [sportsTeams.clubId], references: [clubs.id] }),
}));

export const sportsMatchesRelations = relations(sportsMatches, ({ one }) => ({
  tournament: one(sportsTournaments, {
    fields: [sportsMatches.tournamentId],
    references: [sportsTournaments.id],
  }),
  league: one(sportsLeagues, {
    fields: [sportsMatches.leagueId],
    references: [sportsLeagues.id],
  }),
  teamA: one(sportsTeams, {
    relationName: "matchTeamA",
    fields: [sportsMatches.teamAId],
    references: [sportsTeams.id],
  }),
  teamB: one(sportsTeams, {
    relationName: "matchTeamB",
    fields: [sportsMatches.teamBId],
    references: [sportsTeams.id],
  }),
}));

export const sportsPeopleRelations = relations(sportsPeople, ({ one }) => ({
  photo: one(media, { fields: [sportsPeople.photoId], references: [media.id] }),
}));

export const sportsPageConfigRelations = relations(
  sportsPageConfig,
  ({ one }) => ({
    academyLogo: one(media, {
      fields: [sportsPageConfig.academyLogoId],
      references: [media.id],
    }),
  }),
);

// ─────────────────────────────── inferred types ──────────────────────────────

export type DbUser = typeof users.$inferSelect;
export type DbEvent = typeof events.$inferSelect;
export type DbEventClub = typeof eventClubs.$inferSelect;
export type DbClub = typeof clubs.$inferSelect;
export type DbMedia = typeof media.$inferSelect;
export type DbRecap = typeof recaps.$inferSelect;
export type DbClubMembership = typeof clubMemberships.$inferSelect;
export type DbContentRevision = typeof contentRevisions.$inferSelect;
export type DbAnnouncement = typeof announcements.$inferSelect;
export type DbHighlight = typeof highlights.$inferSelect;
export type DbFaq = typeof faqs.$inferSelect;
export type DbCouncilMember = typeof councilMembers.$inferSelect;
export type DbSupportChannel = typeof supportChannels.$inferSelect;
export type DbEventRegistration = typeof eventRegistrations.$inferSelect;
export type DbAttendee = typeof attendees.$inferSelect;
export type DbNotification = typeof notifications.$inferSelect;
export type DbAuditLog = typeof auditLog.$inferSelect;
export type DbSportsTournament = typeof sportsTournaments.$inferSelect;
export type DbSportsLeague = typeof sportsLeagues.$inferSelect;
export type DbSportsTeam = typeof sportsTeams.$inferSelect;
export type DbSportsMatch = typeof sportsMatches.$inferSelect;
export type DbSportsPerson = typeof sportsPeople.$inferSelect;
export type DbSportsPageConfig = typeof sportsPageConfig.$inferSelect;
export type DbOvalMenuDay = typeof ovalMenuDays.$inferSelect;

// Marker referenced where self/cyclic FK typing is needed.
export type _CyclicColumn = AnySQLiteColumn;
