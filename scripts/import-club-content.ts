/**
 * Seed the club detail pages from the council's own spreadsheet.
 *
 *   npm run clubs:import-content            # apply
 *   npm run clubs:import-content -- --dry   # report only, write nothing
 *   npm run clubs:import-content -- --force # re-seed, overwriting existing values
 *
 * `Woxsen_Clubs_2026-2027.csv` already holds a vision statement and an activity
 * list for all 28 clubs, which is exactly the `about` + `activities` content the
 * new /clubs/[slug] page wants. Typing it back in by hand 28 times would be
 * silly, so this reads the CSV and fills those two columns.
 *
 * ONLY fills fields that are currently empty. Re-running is safe, and it will
 * never overwrite something a club lead has since written in the panel — which
 * is the property that makes this runnable against production without a
 * pre-flight backup.
 *
 * Deliberately does NOT guess accent colours, covers or videos: those are
 * judgement calls that belong to each club, not to a spreadsheet.
 */
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

config({ path: ".env.local", quiet: true });

const CSV_PATH = "Woxsen_Clubs_2026-2027.csv";

/**
 * Minimal RFC-4180 reader: handles quoted fields, embedded commas/newlines and
 * doubled quotes ("" → "). Written out rather than pulled from a dependency
 * because this is the only CSV in the repo and it is ours.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  // Trailing field/row when the file doesn't end in a newline.
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim()));
}

/**
 * The activity column is authored inconsistently — most rows separate items
 * with semicolons, a few with commas. Prefer semicolons; fall back to commas
 * only when that yields nothing, so "Workshops (Tie and Dye, Bookmaking)"
 * survives intact rather than being torn in half.
 */
function splitActivities(cell: string): string[] {
  const bySemicolon = cell
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
  if (bySemicolon.length > 1) return bySemicolon;
  return cell
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Loose key for matching a CSV name to a DB row: lowercase alphanumerics. */
function key(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * The CSV's vision column is a fragment with the club as its implied subject,
 * written two different ways:
 *
 *   verb phrase — "Provides a creative community space…"
 *   noun phrase — "A multicultural language and linguistics platform…"
 *
 * Both need the club's name in front, but they need different joins: a verb
 * phrase attaches directly ("Aesthetrix provides a…") while a noun phrase needs
 * a copula ("Nexus Club is a multicultural…"). Getting this wrong is what
 * produced "Club Genesis A space for understanding self" on the first pass.
 *
 * The test is deliberately narrow rather than clever: every verb phrase in this
 * spreadsheet is third-person singular and so ends in "s" (provides, creates,
 * bridges, aims…). Anything else is treated as a noun phrase. That is a rule
 * fitted to THIS file, not a general English parser — the output is checked by
 * eye once, and afterwards clubs edit their own copy in the panel.
 */
function toSentence(clubName: string, vision: string): string {
  // Drop the disambiguating parenthetical: it belongs in the page title, not
  // in the middle of a prose sentence.
  const shortName = clubName.replace(/\s*\(.*?\)\s*/g, " ").trim() || clubName;
  const body = vision.trim().replace(/\.$/, "");
  if (!body) return "";

  const lower = body[0].toLowerCase() + body.slice(1);
  const firstWord = body.split(/\s+/)[0];

  // Already carries its own article: "A multicultural platform…"
  if (/^(a|an|the)$/i.test(firstWord)) return `${shortName} is ${lower}.`;

  // Verb phrase: "Provides a creative community space…"
  if (/s$/i.test(firstWord)) return `${shortName} ${lower}.`;

  // Bare noun phrase: "Impact-driven club focused on…" — supply the article.
  const article = /^[aeiou]/i.test(firstWord) ? "an" : "a";
  return `${shortName} is ${article} ${lower}.`;
}

type DbClub = {
  id: number;
  name: string;
  slug: string;
  about: string | null;
  activities: string | null;
};

async function main() {
  const dry = process.argv.includes("--dry") || process.argv.includes("--dry-run");
  // Escape hatch for re-seeding immediately after a bad first import. Once club
  // leads have started editing in the panel, DON'T use this — it overwrites them.
  const force = process.argv.includes("--force");
  const url = process.env.LIBSQL_URL || "file:./payload.db";
  const client = createClient({
    url,
    authToken: process.env.LIBSQL_AUTH_TOKEN,
  });

  // The spreadsheet is deliberately NOT committed — it's a working document,
  // not app source. Say so plainly rather than surfacing a raw ENOENT.
  if (!existsSync(CSV_PATH)) {
    throw new Error(
      `${CSV_PATH} not found in the project root.\n` +
        `   This spreadsheet isn't tracked in git — get the current copy from\n` +
        `   the council's drive and drop it here before running the import.`,
    );
  }

  const rows = parseCsv(readFileSync(CSV_PATH, "utf8"));
  const [header, ...body] = rows;
  if (!header || header.length < 3) {
    throw new Error(`${CSV_PATH}: expected 3 columns (name, vision, activities)`);
  }

  const dbRows = (
    await client.execute(
      "select id, name, slug, about, activities from mp_clubs",
    )
  ).rows as unknown as DbClub[];
  const byKey = new Map(dbRows.map((c) => [key(c.name), c]));
  // Slug is the fallback when the spreadsheet name has drifted from the DB one.
  const bySlugKey = new Map(dbRows.map((c) => [key(c.slug), c]));

  let filled = 0;
  let skipped = 0;
  const unmatched: string[] = [];

  for (const [rawName, rawVision, rawActivities] of body) {
    const name = (rawName ?? "").trim();
    if (!name) continue;

    const club = byKey.get(key(name)) ?? bySlugKey.get(key(name));
    if (!club) {
      unmatched.push(name);
      continue;
    }

    const patch: Record<string, string> = {};

    if ((force || !club.about?.trim()) && rawVision?.trim()) {
      patch.about = toSentence(club.name, rawVision);
    }

    // `activities` defaults to the literal '[]', so check the parsed length
    // rather than truthiness of the column.
    const existing = safeParseArray(club.activities);
    if ((force || existing.length === 0) && rawActivities?.trim()) {
      const items = splitActivities(rawActivities).map((title) => ({ title }));
      if (items.length > 0) patch.activities = JSON.stringify(items);
    }

    if (Object.keys(patch).length === 0) {
      skipped++;
      continue;
    }

    filled++;
    const fields = Object.keys(patch);
    console.log(
      `  ${dry ? "would fill" : "✓"} ${club.name} → ${fields.join(", ")}`,
    );
    if (dry) continue;

    await client.execute({
      sql: `update mp_clubs set ${fields
        .map((f) => `${f} = ?`)
        .join(", ")}, updated_at = ? where id = ?`,
      args: [...fields.map((f) => patch[f]), new Date().toISOString(), club.id],
    });
  }

  console.log(
    `\n${dry ? "[dry run] " : ""}${filled} club(s) updated, ${skipped} already had content.`,
  );
  if (unmatched.length > 0) {
    console.warn(
      `\n⚠ ${unmatched.length} CSV row(s) matched no club in the database:\n` +
        unmatched.map((n) => `   • ${n}`).join("\n") +
        `\n   Add them via the panel, or run 'npm run clubs:sync-taxonomy' first.`,
    );
  }
}

function safeParseArray(value: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
