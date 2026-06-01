/**
 * One-time, idempotent data copy: Payload tables → mp_* tables.
 *
 * Reads Payload's existing tables with raw libSQL, writes the new Drizzle
 * tables. Re-runnable: each target table is cleared then refilled. Integer PKs
 * are preserved so foreign keys stay valid. Payload's tables are never mutated.
 *
 *   npm run db:migrate-from-payload
 *
 * Notes:
 *  - Passwords (PBKDF2 salt/hash) are NOT copied — admins re-seed via env.
 *  - The `__system@local.invalid` backdoor row is dropped.
 *  - Lexical rich text (events.description, faqs.answer) is flattened to text.
 *  - Homepage/site arrays are empty in the source today, so the public site
 *    falls back to defaults in content.ts exactly as it does now.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type Row } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../src/db/schema";
import {
  announcements,
  clubs,
  councilMembers,
  events,
  faqs,
  highlights,
  homepageConfig,
  media,
  recaps,
  siteSettings,
  supportChannels,
  users,
} from "../src/db/schema";

// NOTE: build the client AFTER dotenv.config() has run (above). Importing the
// shared `src/db/client` singleton here would evaluate it before env is loaded
// (ESM hoists imports), silently falling back to a local file. So we construct
// our own client over the same remote URL here.
const raw = createClient({
  url: process.env.LIBSQL_URL!,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});
const db = drizzle(raw, { schema });

// ── helpers ──────────────────────────────────────────────────────────────────

/** Flatten a Lexical editor-state JSON string to plain text (mirrors content.ts). */
function lexicalToText(v: unknown): string {
  if (!v) return "";
  let parsed: unknown = v;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s.startsWith("{")) return v; // already plain text
    try {
      parsed = JSON.parse(s);
    } catch {
      return v;
    }
  }
  const root = (parsed as { root?: { children?: unknown[] } }).root;
  if (!root?.children) return typeof v === "string" ? v : "";
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; text?: string; children?: unknown[] };
    if (typeof n.text === "string") parts.push(n.text);
    if (Array.isArray(n.children)) n.children.forEach(walk);
    if (n.type === "paragraph" || n.type === "heading") parts.push("\n");
  };
  root.children.forEach(walk);
  return parts.join("").trim();
}

const bool = (v: unknown) => v === 1 || v === true || v === "1";
const num = (v: unknown) => (v == null ? null : Number(v));
const str = (v: unknown) => (v == null ? null : String(v));

async function rows(sql: string): Promise<Row[]> {
  return (await raw.execute(sql)).rows;
}

/** Build a parent_id -> string[] map from a Payload `*_texts` child table. */
async function textsByParent(
  table: string,
  path: string,
): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  const r = await rows(
    `SELECT parent_id, text FROM ${table} WHERE path = '${path}' ORDER BY parent_id, "order"`,
  );
  for (const row of r) {
    const pid = Number(row.parent_id);
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid)!.push(String(row.text));
  }
  return map;
}

// ── migration ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("→ Clearing mp_* tables (idempotent re-run)…");
  // Order respects FKs (children first).
  for (const t of [
    "mp_attendees",
    "mp_event_registrations",
    "mp_recaps",
    "mp_announcements",
    "mp_highlights",
    "mp_faqs",
    "mp_council_members",
    "mp_support_channels",
    "mp_homepage_config",
    "mp_site_settings",
    "mp_events",
    "mp_clubs",
    "mp_media",
    "mp_users",
  ]) {
    await raw.execute(`DELETE FROM ${t}`);
  }

  // users — drop backdoor, skip password
  const userRows = await rows("SELECT * FROM users");
  let migratedUsers = 0;
  for (const u of userRows) {
    if (String(u.email).toLowerCase() === "__system@local.invalid") continue;
    await db.insert(users).values({
      id: Number(u.id),
      name: str(u.name) ?? "",
      email: String(u.email).toLowerCase(),
      password: null, // re-seed via env
      role: (str(u.role) as never) ?? "viewer",
      clubId: num(u.club_id),
      phone: str(u.phone),
      createdAt: str(u.created_at) ?? undefined,
      updatedAt: str(u.updated_at) ?? undefined,
    });
    migratedUsers++;
  }
  console.log(`  users: ${migratedUsers} (backdoor + passwords excluded)`);

  // media
  const mediaRows = await rows("SELECT * FROM media");
  for (const m of mediaRows) {
    await db.insert(media).values({
      id: Number(m.id),
      alt: str(m.alt) ?? "",
      url: str(m.url) ?? "",
      filename: str(m.filename),
      mimeType: str(m.mime_type),
      filesize: num(m.filesize),
      width: num(m.width),
      height: num(m.height),
      credit: str(m.credit),
      tags: [],
      createdAt: str(m.created_at) ?? undefined,
      updatedAt: str(m.updated_at) ?? undefined,
    });
  }
  console.log(`  media: ${mediaRows.length}`);

  // clubs (+ tags from clubs_texts)
  const clubTags = await textsByParent("clubs_texts", "tags");
  const clubRows = await rows("SELECT * FROM clubs");
  for (const c of clubRows) {
    await db.insert(clubs).values({
      id: Number(c.id),
      name: str(c.name) ?? "",
      slug: str(c.slug) ?? "",
      logoId: num(c.logo_id),
      blurb: str(c.blurb) ?? "",
      joinUrl: str(c.join_url),
      tags: clubTags.get(Number(c.id)) ?? [],
      members: num(c.members),
      leadId: num(c.lead_id),
      createdAt: str(c.created_at) ?? undefined,
      updatedAt: str(c.updated_at) ?? undefined,
    });
  }
  console.log(`  clubs: ${clubRows.length} (tags from ${clubTags.size} clubs)`);

  // events (description Lexical→text)
  const eventRows = await rows("SELECT * FROM events");
  let skippedEvents = 0;
  for (const e of eventRows) {
    // Skip incomplete autosave-draft rows (null slug/title) — they never had
    // content and would collide on the empty slug. Public site filters them
    // out via status='published' anyway.
    if (!str(e.slug) || !str(e.title)) {
      skippedEvents++;
      continue;
    }
    await db.insert(events).values({
      id: Number(e.id),
      title: str(e.title) ?? "",
      slug: str(e.slug) ?? "",
      status: (str(e.status) as never) ?? "draft",
      category: (str(e.category) as never) ?? "tech",
      date: str(e.date) ?? "",
      endDate: str(e.end_date),
      venue: str(e.venue) ?? "",
      excerpt: str(e.excerpt) ?? "",
      description: lexicalToText(e.description),
      bannerId: num(e.banner_id),
      videoUrl: str(e.video_url),
      registrationUrl: str(e.registration_url),
      attendees: num(e.attendees),
      featured: bool(e.featured),
      organizerId: num(e.organizer_id),
      clubId: num(e.club_id),
      publishedAt: str(e.status) === "published" ? str(e.created_at) : null,
      createdAt: str(e.created_at) ?? undefined,
      updatedAt: str(e.updated_at) ?? undefined,
    });
  }
  console.log(
    `  events: ${eventRows.length - skippedEvents} (${skippedEvents} incomplete drafts skipped)`,
  );

  // recaps (gallery/stats child tables are empty today)
  const recapRows = await rows("SELECT * FROM recaps");
  for (const r of recapRows) {
    await db.insert(recaps).values({
      id: Number(r.id),
      title: str(r.title) ?? "",
      slug: str(r.slug) ?? "",
      eventId: num(r.event_id),
      kicker: str(r.kicker),
      blurb: str(r.blurb),
      publishedAt: str(r.published_at),
      heroMediaId: num(r.hero_media_id),
      heroVideoUrl: str(r.hero_video_url),
      gallery: [],
      stats: [],
      status: str(r._status) === "published" ? "published" : "draft",
      createdAt: str(r.created_at) ?? undefined,
      updatedAt: str(r.updated_at) ?? undefined,
    });
  }
  console.log(`  recaps: ${recapRows.length}`);

  // announcements
  const annRows = await rows("SELECT * FROM announcements");
  for (const a of annRows) {
    await db.insert(announcements).values({
      id: Number(a.id),
      title: str(a.title) ?? "",
      href: str(a.href),
      date: str(a.date) ?? "",
      pinned: bool(a.pinned),
      createdAt: str(a.created_at) ?? undefined,
      updatedAt: str(a.updated_at) ?? undefined,
    });
  }
  console.log(`  announcements: ${annRows.length}`);

  // highlights (0 today, but handle it)
  const hlRows = await rows("SELECT * FROM highlights");
  for (const h of hlRows) {
    await db.insert(highlights).values({
      id: Number(h.id),
      imageId: num(h.image_id),
      alt: str(h.alt) ?? "",
      caption: str(h.caption),
      span: (str(h.span) as never) ?? "md",
      sortOrder: num(h.order) ?? 99,
      createdAt: str(h.created_at) ?? undefined,
      updatedAt: str(h.updated_at) ?? undefined,
    });
  }
  console.log(`  highlights: ${hlRows.length}`);

  // faqs (answer Lexical→text)
  const faqRows = await rows("SELECT * FROM faqs");
  for (const f of faqRows) {
    await db.insert(faqs).values({
      id: Number(f.id),
      question: str(f.question) ?? "",
      answer: lexicalToText(f.answer),
      page: (str(f.page) as never) ?? "council",
      sortOrder: num(f.order) ?? 99,
      createdAt: str(f.created_at) ?? undefined,
      updatedAt: str(f.updated_at) ?? undefined,
    });
  }
  console.log(`  faqs: ${faqRows.length}`);

  // council members
  const cmRows = await rows("SELECT * FROM council_members");
  for (const c of cmRows) {
    await db.insert(councilMembers).values({
      id: Number(c.id),
      name: str(c.name) ?? "",
      role: str(c.role) ?? "",
      program: str(c.program) ?? "",
      photoId: num(c.photo_id),
      email: str(c.email),
      linkedin: str(c.linkedin),
      message: str(c.message),
      quote: str(c.quote),
      isPresident: bool(c.is_president),
      featured: bool(c.featured),
      sortOrder: num(c.order) ?? 99,
      createdAt: str(c.created_at) ?? undefined,
      updatedAt: str(c.updated_at) ?? undefined,
    });
  }
  console.log(`  council_members: ${cmRows.length}`);

  // support channels (+ bring from support_channels_texts)
  const bringMap = await textsByParent("support_channels_texts", "bring");
  const scRows = await rows("SELECT * FROM support_channels");
  for (const s of scRows) {
    await db.insert(supportChannels).values({
      id: Number(s.id),
      name: str(s.name) ?? "",
      purpose: str(s.purpose) ?? "",
      description: str(s.description) ?? "",
      icon: str(s.icon) ?? "LifeBuoy",
      ownedBy: str(s.owned_by) ?? "",
      bring: bringMap.get(Number(s.id)) ?? [],
      councilRole: str(s.council_role) ?? "",
      createdAt: str(s.created_at) ?? undefined,
      updatedAt: str(s.updated_at) ?? undefined,
    });
  }
  console.log(`  support_channels: ${scRows.length}`);

  // homepage_config (single row; arrays empty in source → defaults applied in content.ts)
  const hc = (await rows("SELECT * FROM homepage_config LIMIT 1"))[0];
  await db.insert(homepageConfig).values({
    id: 1,
    hero: {
      kicker: str(hc?.hero_kicker) ?? "",
      headline: str(hc?.hero_headline) ?? "",
      sublineLead: str(hc?.hero_subline_lead) ?? "",
      sublineWords: [],
      subParagraph: str(hc?.hero_sub_paragraph) ?? "",
      ctas: [],
      marqueeText: str(hc?.hero_marquee_text) ?? "",
    },
    statsKicker: str(hc?.stats_kicker),
    stats: [],
    manifestoKicker: str(hc?.manifesto_kicker),
    manifestoLines: [],
    manifestoFooter: str(hc?.manifesto_footer),
    quickActions: [],
    closingCta: {
      kicker: str(hc?.closing_cta_kicker) ?? "",
      headlineLead: str(hc?.closing_cta_headline_lead) ?? "",
      headlineTail: str(hc?.closing_cta_headline_tail) ?? "",
      ctas: [],
    },
    flagshipEventId: num(hc?.flagship_event_id),
    featuredClubIds: [],
    vaultStoryIds: [],
    tagline: str(hc?.tagline),
  });
  console.log(`  homepage_config: 1`);

  // site_settings (0 rows in source → seed defaults matching content.ts)
  await db.insert(siteSettings).values({
    id: 1,
    siteName: "Woxsen Student Council",
    tagline: null,
    contactEmail: null,
    instagramUrl: null,
    linkedinUrl: null,
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
  });
  console.log(`  site_settings: 1 (seeded defaults)`);

  console.log("\n✓ Migration complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
