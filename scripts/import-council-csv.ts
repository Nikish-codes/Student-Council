/**
 * Import council members from the membership spreadsheet.
 *
 *   npx tsx scripts/import-council-csv.ts "path/to/SC Members(MEMBERDATA).csv"
 *   npx tsx scripts/import-council-csv.ts <file> --dry     # preview, no writes
 *
 * Idempotent: rows are matched on email (case-insensitive), falling back to a
 * normalised name, so re-running updates people instead of duplicating them.
 * Existing portraits, president messages and hand-edited role addresses are
 * preserved — the CSV only fills what it actually knows.
 *
 * Deliberately NOT imported: roll numbers and personal phone numbers. They are
 * personal data with no column to live in and no business being on a public page.
 *
 * Co-leads are skipped (they get their own treatment later).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { and, eq, isNull, sql } from "drizzle-orm";

import * as schema from "../src/db/schema";
import { councilGroups, councilMembers } from "../src/db/schema";

// Build the client AFTER dotenv: ESM hoists every `import` above the config()
// call, so importing @/db/client here would capture an unset LIBSQL_URL and
// silently fall back to a local sqlite file.
const db = drizzle(
  createClient({
    url: process.env.LIBSQL_URL!,
    authToken: process.env.LIBSQL_AUTH_TOKEN,
  }),
  { schema },
);

// ─────────────────────────── CSV parsing ───────────────────────────

/** Minimal RFC4180 reader — quoted fields, embedded commas and newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * The export is Windows-1252, not UTF-8 (it contains a 0x96 en dash). Decode as
 * latin1 and repair the handful of cp1252 punctuation bytes that differ.
 */
function readSheet(path: string): string[][] {
  const raw = readFileSync(path).toString("latin1");
  const fixed = raw
    .replace(/[\u0091\u0092]/g, "'")
    .replace(/[\u0093\u0094]/g, '"')
    .replace(/\u0096/g, "\u2013")
    .replace(/\u0097/g, "\u2014")
    .replace(/\u0085/g, "\u2026");
  return parseCsv(fixed);
}

// ─────────────────────────── tidying ───────────────────────────

/**
 * Title-case a word only when it is shouting (ALL CAPS) or entirely lowercase.
 * Initials ("P", "V."), and already-mixed names ("McCarthy") are left alone.
 */
function tidyName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => {
      if (w.length <= 1) return w;
      if (/^[A-Z]\.$/.test(w)) return w;
      // Short all-caps tokens are initials ("Tanusri SP"), not shouting.
      if (w.length <= 3 && w === w.toUpperCase() && !w.includes(".")) return w;
      const isShouting = w === w.toUpperCase() && /[A-Z]{2,}/.test(w);
      const isQuiet = w === w.toLowerCase();
      if (!isShouting && !isQuiet) return w;
      return w[0].toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Capitalise the stray lowercase "president"/"lead"; leave acronyms alone. */
function tidyRole(role: string): string {
  return role
    .trim()
    .replace(/\bpresident\b/g, "President")
    .replace(/\blead\b/g, "Lead")
    .replace(/\s+/g, " ");
}

/** Collapse the free-text programme field to something presentable. */
function tidyProgram(p: string): string {
  return p.trim().replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ");
}

const normName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

// ─────────────────────────── classification ───────────────────────────

type Bucket =
  | "president"
  | "Vice Presidents"
  | "Secretaries & Treasurers"
  | "Core Team"
  | "School Representatives"
  | "Club Presidents"
  | "skip";

function bucketOf(position: string): Bucket {
  const p = position.toLowerCase();
  if (p === "president") return "president";
  if (p === "vice president") return "Vice Presidents";
  if (p.includes("general secretary") || p.includes("treasurer"))
    return "Secretaries & Treasurers";
  if (p.startsWith("sr ")) return "School Representatives";
  if (p.includes("co lead") || p.includes("co-lead")) return "skip";
  if (p.endsWith("lead")) return "Core Team";
  if (p.includes("club")) return "Club Presidents";
  return "skip";
}

// ─────────────────────────── the one-line quotes ───────────────────────────
// The spreadsheet has no "line" column, so these are written per position.
// Deliberately one distinct line each — a single template repeated 56 times
// reads as filler, which is worse than an empty field.

const LINES_BY_POSITION: Record<string, string | string[]> = {
  "vice president": [
    "Between the student body and the administration, someone has to carry the message both ways.",
    "The Council works best when the quiet requests get the same attention as the loud ones.",
    "Every club, every event, every complaint — it all has to land somewhere. It lands here.",
  ],
  "general secretary": [
    "Minutes, motions and follow-ups — the paperwork that stops promises from evaporating.",
    "If it was decided in a meeting, it gets written down, and then it gets done.",
  ],
  treasurer: [
    "Every rupee the Council spends should trace back to a student who benefited from it.",
    "A budget is just a plan with numbers attached — and plans should be public.",
  ],

  // Core team
  "alumni relations lead": "The people who left still have doors worth opening for the people still here.",
  "operations lead": "Everything that looks effortless on the day took a month of unglamorous planning.",
  "cultural lead": "Campus culture isn't the calendar of events. It's what happens between them.",
  "pr & media lead": "If the Council does good work and nobody hears about it, half the job is undone.",
  "sports lead": "The arena belongs to whoever shows up, not just the people already on a team.",
  "student welfare lead": "Wellbeing isn't a poster on a wall. It's whether someone picks up when you call.",
  "tech lead": "Every tool the Council runs on should be fast, open, and built by students.",
  "outreach lead": "A council that only talks to people who already talk to it isn't representing much.",
  "facilities lead": "Hostels, classrooms, mess halls — the things you only notice once they're broken.",
  "design lead": "How the Council looks is how seriously people take what it has to say.",
  "entrepreneurship lead": "Good ideas on this campus shouldn't die waiting for permission.",
  "production lead": "Sound, light and staging — the difference between an event and an experience.",

  // School representatives
  "sr soap": "Studio hours are long. Someone should be making sure they're worth it.",
  "sr soad": "Design students need space, materials and time. I'm here to argue for all three.",
  "sr sob ug": "Undergrad business is the biggest cohort here. It shouldn't be the least heard.",
  "sr sob pg": "Postgrad life runs on a different clock, and the Council should keep up with it.",
  "sr sol": "Law students read the fine print for a living. We should hold the Council to it too.",
  "sr solh": "The humanities ask the questions the rest of campus is too busy to.",
  "sr sos": "Lab access, equipment and time — the things science students actually need.",
  "sr sot": "Tech students build half of what this campus runs on. Let's back them properly.",

  // Club presidents
  "aesthetrix club president": "A club for people who notice how things look, and want to make them look better.",
  "animal welfare club president": "The campus isn't only ours. The animals on it deserve someone in their corner.",
  "communication design club president": "Every poster, every title card, every logo on campus started as a rough sketch.",
  "distortion club president": "Loud, strange and unapologetic — there should be room on campus for that.",
  "drishyakala - the film club president": "Everyone has a film in them. We hand out the camera and the deadline.",
  "finwiz club president": "Markets, models and money — demystified for anyone willing to sit down and learn.",
  "fashion design club president": "What you wear is the first thing you ever say. We take that seriously.",
  "genesis club president": "Every big thing on this campus started as somebody's half-formed idea.",
  "global sustainability club president": "Small campus habits scale. That's the entire point of starting here.",
  "ideate club president": "Bring the rough idea. We'll help you find out whether it survives contact.",
  "janspandan club president": "Service isn't a line on a CV. It's turning up when it's inconvenient.",
  "jashn club president": "Celebration takes more planning than anyone watching ever realises.",
  "just naach club president": "You don't need training to dance with us. You need to show up twice.",
  "law club president": "Moots, debates and the fine print — practice for the rooms that matter later.",
  "literature club president": "Books, arguments about books, and the people who can't stop writing.",
  "marketing director's club president": "Every product needs a story, and every story needs someone to tell it well.",
  "rotaract club president": "Service above self, run by students who'd rather do than discuss.",
  "spectrum club president": "A place to be yourself on a campus that's still learning what that takes.",
  "tantra club president": "Tradition, performance and craft — carried forward by the people who love it.",
  "tech club president": "Build things, break things, and show the campus what students can ship.",
  "utopia esports club president": "Competitive gaming deserves the same seriousness as any other sport here.",
  "interior design club president": "Space changes how people behave in it. That's a superpower worth learning.",
  "paparazzi club president": "Somebody has to be there with a lens when the moment actually happens.",
  "debate club president": "Argue well, lose gracefully, and change your mind when the evidence says so.",
  "skribble club": "Sketchbooks open, no talent threshold, no grading — just drawing together.",
  "crowdcore club": "Nothing on this campus happens without a crowd. We're the ones who gather it.",
  "humanique club": "People first — the club for anyone interested in what makes us tick.",
  "nexus club": "The connective tissue between disciplines that don't usually talk to each other.",
};

function lineFor(position: string, seen: Map<string, number>): string | null {
  const key = position.toLowerCase().trim();
  const entry = LINES_BY_POSITION[key];
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  const n = seen.get(key) ?? 0;
  seen.set(key, n + 1);
  return entry[Math.min(n, entry.length - 1)];
}

// ─────────────────────────── main ───────────────────────────

type Incoming = {
  name: string;
  email: string;
  program: string;
  role: string;
  bucket: Bucket;
  quote: string | null;
};

async function main() {
  const file = process.argv[2];
  const dry = process.argv.includes("--dry");
  if (!file) {
    console.error('Usage: tsx scripts/import-council-csv.ts "<file.csv>" [--dry]');
    process.exit(1);
  }

  const rows = readSheet(file).filter((r) => r.some((c) => c.trim()));
  const body = rows.slice(1).filter((r) => r[0]?.trim());

  const seenPositions = new Map<string, number>();
  const incoming: Incoming[] = [];
  let skipped = 0;

  for (const r of body) {
    const [name, email, , , program, position] = r.map((c) => (c ?? "").trim());
    if (!name || !position) continue;
    const bucket = bucketOf(position);
    if (bucket === "skip") {
      skipped++;
      continue;
    }
    incoming.push({
      name: tidyName(name),
      email: email.toLowerCase(),
      program: tidyProgram(program),
      role: tidyRole(position),
      bucket,
      quote: lineFor(position, seenPositions),
    });
  }

  // Resolve group ids by title so the script doesn't depend on seeded ids.
  const groups = await db.select().from(councilGroups);
  const groupId = new Map(groups.map((g) => [g.title, g.id]));
  const missing = [...new Set(incoming.map((i) => i.bucket))].filter(
    (b) => b !== "president" && !groupId.has(b),
  );
  if (missing.length) {
    console.error("Missing council sections:", missing.join(", "));
    console.error("Run `npm run db:migrate` first.");
    process.exit(1);
  }

  const existing = await db.select().from(councilMembers);
  const byEmail = new Map(
    existing.filter((m) => m.email).map((m) => [m.email!.toLowerCase(), m]),
  );
  const byName = new Map(existing.map((m) => [normName(m.name), m]));

  const claimed = new Set<number>();

  /**
   * Find the existing row for an incoming person. Exact email wins, then exact
   * name. Failing that, a containment match catches the same person recorded
   * under a shorter or longer form of their name ("Tanusri" ↔ "Tanusri SP",
   * "Inayat Ali Khan" ↔ "Mir Inayat Ali Khan") — but only when it is
   * unambiguous, so two different Sharanyas can never collapse into one row.
   * The sitting president is matched by role as a last resort.
   */
  function findExisting(m: Incoming, isPresident: boolean) {
    const exact =
      (m.email && byEmail.get(m.email)) || byName.get(normName(m.name));
    if (exact) return exact;

    const n = normName(m.name);
    const near = existing.filter((e) => {
      if (claimed.has(e.id)) return false;
      const en = normName(e.name);
      if (en.length < 6 || n.length < 6) return false;
      return en.includes(n) || n.includes(en);
    });
    if (near.length === 1) return near[0];

    if (isPresident) {
      const sitting = existing.filter(
        (e) => e.memberType === "president" && !claimed.has(e.id),
      );
      if (sitting.length === 1) return sitting[0];
    }
    return null;
  }

  const perGroupOrder = new Map<string, number>();
  let created = 0;
  let updated = 0;

  for (const m of incoming) {
    const isPresident = m.bucket === "president";
    const match = findExisting(m, isPresident);
    if (match) claimed.add(match.id);
    const gid = isPresident ? null : groupId.get(m.bucket)!;
    const orderKey = m.bucket;
    const order = (perGroupOrder.get(orderKey) ?? 0) + 1;
    perGroupOrder.set(orderKey, order);

    if (match) {
      // Never clobber a portrait, a president's message, or an address that was
      // deliberately set to a role inbox rather than a personal one.
      const patch: Record<string, unknown> = {
        name: m.name,
        role: m.role,
        program: m.program,
        memberType: isPresident ? "president" : "member",
        isPresident,
        groupId: gid,
        sortOrder: order,
        updatedAt: new Date().toISOString(),
      };
      if (!match.email && m.email) patch.email = m.email;
      if (!match.quote && m.quote) patch.quote = m.quote;

      if (!dry) {
        await db
          .update(councilMembers)
          .set(patch)
          .where(eq(councilMembers.id, match.id));
      }
      updated++;
      console.log(`  ~ ${m.name} — ${m.role}`);
    } else {
      if (!dry) {
        await db.insert(councilMembers).values({
          name: m.name,
          role: m.role,
          program: m.program,
          email: m.email || null,
          quote: m.quote,
          memberType: isPresident ? "president" : "member",
          isPresident,
          groupId: gid,
          sortOrder: order,
        });
      }
      created++;
      console.log(`  + ${m.name} — ${m.role}`);
    }
  }

  // One president only, mirroring the panel's own rule.
  if (!dry) {
    const pres = await db.query.councilMembers.findFirst({
      where: eq(councilMembers.memberType, "president"),
    });
    if (pres) {
      await db
        .update(councilMembers)
        .set({ memberType: "member", isPresident: false })
        .where(
          and(
            sql`${councilMembers.id} <> ${pres.id}`,
            eq(councilMembers.memberType, "president"),
          ),
        );
      await db
        .update(councilMembers)
        .set({ groupId: null })
        .where(
          and(eq(councilMembers.id, pres.id), isNull(councilMembers.groupId)),
        );
    }
  }

  console.log(
    `\n${dry ? "[dry run] " : ""}created ${created}, updated ${updated}, skipped ${skipped} co-leads.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
