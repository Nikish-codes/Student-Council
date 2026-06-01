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
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

import type {
  CampusSettings,
  ClosingCta,
  EventCategory,
  GrievanceCategory,
  HomepageHero,
  HomepageStat,
  ManifestoLine,
  QuickAction,
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
  | "admin"
  | "council_member"
  | "club_lead"
  | "editor"
  | "viewer";

export type EventStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "archived";

export type RegistrationStatus = "pending" | "confirmed" | "cancelled";
export type PaymentStatus =
  | "none"
  | "created"
  | "paid"
  | "failed"
  | "refunded";

export type RecapGalleryItem = { url: string; caption?: string };
export type RecapStat = { label: string; value: string };

// ─────────────────────────────────── users ───────────────────────────────────
// clubId <-> clubs.leadId is a circular reference; both kept as plain integer
// columns (no hard FK) and wired through `relations()` to avoid SQLite
// circular-FK creation-order headaches.

export const users = sqliteTable("mp_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  // bcrypt hash. Nullable so a row can exist pre-password (invited users).
  password: text("password"),
  role: text("role").$type<UserRole>().notNull().default("viewer"),
  clubId: integer("club_id"),
  phone: text("phone"),
  // Optimistic lockout fields (Phase 4 rate-limiting).
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: text("locked_until"),
  createdAt,
  updatedAt,
}, (t) => ({
  emailIdx: uniqueIndex("mp_users_email_idx").on(t.email),
}));

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

export const clubs = sqliteTable("mp_clubs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  logoId: integer("logo_id").references(() => media.id),
  blurb: text("blurb").notNull(),
  joinUrl: text("join_url"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  members: integer("members"),
  leadId: integer("lead_id"), // -> users.id (circular; via relations)
  createdAt,
  updatedAt,
}, (t) => ({
  slugIdx: uniqueIndex("mp_clubs_slug_idx").on(t.slug),
  nameIdx: uniqueIndex("mp_clubs_name_idx").on(t.name),
}));

// ─────────────────────────────────── events ──────────────────────────────────

export const events = sqliteTable("mp_events", {
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
  createdAt,
  updatedAt,
}, (t) => ({
  slugIdx: uniqueIndex("mp_events_slug_idx").on(t.slug),
  statusIdx: index("mp_events_status_idx").on(t.status),
  dateIdx: index("mp_events_date_idx").on(t.date),
  categoryIdx: index("mp_events_category_idx").on(t.category),
}));

// ─────────────────────────────────── recaps ──────────────────────────────────

export const recaps = sqliteTable("mp_recaps", {
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
  status: text("status").$type<"draft" | "published">().notNull().default("draft"),
  createdAt,
  updatedAt,
}, (t) => ({
  slugIdx: uniqueIndex("mp_recaps_slug_idx").on(t.slug),
}));

// ─────────────────────────────── announcements ───────────────────────────────

export const announcements = sqliteTable("mp_announcements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  href: text("href"),
  date: text("date").notNull(),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  // Set when auto-created by the publish-automation, for dedupe.
  eventId: integer("event_id").references(() => events.id),
  createdAt,
  updatedAt,
}, (t) => ({
  dateIdx: index("mp_announcements_date_idx").on(t.date),
  pinnedIdx: index("mp_announcements_pinned_idx").on(t.pinned),
}));

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
  tagline: text("tagline"),
  updatedAt,
});

export const siteSettings = sqliteTable("mp_site_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }), // enforce id = 1
  siteName: text("site_name").notNull().default("Woxsen Student Council"),
  tagline: text("tagline"),
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

export const eventRegistrations = sqliteTable("mp_event_registrations", {
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
}, (t) => ({
  eventIdx: index("mp_registrations_event_idx").on(t.eventId),
  paymentIdx: uniqueIndex("mp_registrations_payment_idx").on(t.razorpayPaymentId),
}));

export const attendees = sqliteTable("mp_attendees", {
  id: text("id").primaryKey(), // UUID
  registrationId: text("registration_id")
    .notNull()
    .references(() => eventRegistrations.id),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id),
  ticketCode: text("ticket_code").notNull(),
  checkedInAt: text("checked_in_at"),
  checkedInByUserId: integer("checked_in_by_user_id").references(() => users.id),
  createdAt,
}, (t) => ({
  ticketIdx: uniqueIndex("mp_attendees_ticket_idx").on(t.ticketCode),
  eventIdx: index("mp_attendees_event_idx").on(t.eventId),
}));

// ──────────────────────────────── relations ──────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  club: one(clubs, { fields: [users.clubId], references: [clubs.id] }),
  ledClubs: many(clubs),
}));

export const clubsRelations = relations(clubs, ({ one, many }) => ({
  logo: one(media, { fields: [clubs.logoId], references: [media.id] }),
  lead: one(users, { fields: [clubs.leadId], references: [users.id] }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  banner: one(media, { fields: [events.bannerId], references: [media.id] }),
  organizer: one(users, { fields: [events.organizerId], references: [users.id] }),
  club: one(clubs, { fields: [events.clubId], references: [clubs.id] }),
  recaps: many(recaps),
  registrations: many(eventRegistrations),
}));

export const recapsRelations = relations(recaps, ({ one }) => ({
  event: one(events, { fields: [recaps.eventId], references: [events.id] }),
  heroMedia: one(media, { fields: [recaps.heroMediaId], references: [media.id] }),
}));

export const councilMembersRelations = relations(councilMembers, ({ one }) => ({
  photo: one(media, { fields: [councilMembers.photoId], references: [media.id] }),
}));

export const highlightsRelations = relations(highlights, ({ one }) => ({
  image: one(media, { fields: [highlights.imageId], references: [media.id] }),
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
}));

// ─────────────────────────────── inferred types ──────────────────────────────

export type DbUser = typeof users.$inferSelect;
export type DbEvent = typeof events.$inferSelect;
export type DbClub = typeof clubs.$inferSelect;
export type DbMedia = typeof media.$inferSelect;
export type DbRecap = typeof recaps.$inferSelect;
export type DbAnnouncement = typeof announcements.$inferSelect;
export type DbHighlight = typeof highlights.$inferSelect;
export type DbFaq = typeof faqs.$inferSelect;
export type DbCouncilMember = typeof councilMembers.$inferSelect;
export type DbSupportChannel = typeof supportChannels.$inferSelect;
export type DbEventRegistration = typeof eventRegistrations.$inferSelect;
export type DbAttendee = typeof attendees.$inferSelect;

// Marker referenced where self/cyclic FK typing is needed.
export type _CyclicColumn = AnySQLiteColumn;
