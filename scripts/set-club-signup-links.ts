/**
 * Set registration (signup form) links on clubs whose link is still missing or
 * a placeholder (forms.gle/example-*). Matches clubs by name; only overwrites
 * placeholder/empty values so real links already in the DB are never touched.
 *
 *   npm run clubs:set-signup-links
 *
 * Edit CLUB_SIGNUP_LINKS below with new adds. Idempotent: re-running a set
 * whose links are already applied prints "unchanged".
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { clubs } from "../src/db/schema";

// Build the client AFTER dotenv (same as seed-admin.ts).
const raw = createClient({
  url: process.env.LIBSQL_URL!,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});
const db = drizzle(raw, { schema });

const PLACEHOLDER = /example[-/]/i;

/** alias → form URL. Aliases cover how each club was reported to the council. */
const CLUB_SIGNUP_LINKS: Array<{ club: string; aliases: string[]; url: string }> = [
  {
    club: "Street Cause",
    aliases: ["Street Cause Woxsen", "Street Cause"],
    url: "https://forms.cloud.microsoft/r/m5263ZjFtz",
  },
  {
    club: "Club Genesis",
    aliases: ["Club Genesis", "club genesis"],
    url: "https://forms.cloud.microsoft/r/KZqQcBPxKE",
  },
  {
    club: "Spectrum (Science Club)",
    aliases: ["Spectrum Club", "Spectrum"],
    url: "https://forms.cloud.microsoft/r/u5b6qKKyhb",
  },
  {
    club: "Woxsen Debate Club (WDC)",
    aliases: ["Debate Club", "Woxsen Debate Club (WDC)"],
    url: "https://forms.gle/pyjM2axNWCcYst9f7",
  },
  {
    club: "CrowdCore Club",
    aliases: ["Crowdcore Club", "CrowdCore Club"],
    url: "https://docs.google.com/forms/d/e/1FAIpQLSe9YIQ9Np9MQUuop-PUfqBvSIVmMglUjRsoTnhN_ndTq_sULA/viewform?usp=sharing&ouid=116048247048778907182",
  },
  {
    club: "Jashn (Cultural Club)",
    aliases: ["Jashn Club", "Jashn"],
    url: "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=LSD36rPvekOhA1Bbufv3XxGJENENHExKhWUw5ne8s-RUMVBRVEFUTE1MUEhJRVZCNzM0NjVUOTA2OC4u",
  },
  {
    club: "Film Club (Drishyakala)",
    aliases: ["Drishyakala", "Film Club"],
    url: "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=LSD36rPvekOhA1Bbufv3X2VMKM6PU1FPmZ3kHhu6R6lURUNaRjJLQ0hXODBVTzBJVENCTkdOUDBPTi4u",
  },
  {
    club: "Ideate",
    aliases: ["Ideate The Industrial Design Club", "Ideate"],
    url: "https://forms.cloud.microsoft/r/mygc0tRaf0",
  },
  {
    club: "Distortion (Music Club)",
    aliases: ["Distortion"],
    url: "https://forms.cloud.microsoft/r/navHmG9edk",
  },
  {
    club: "CD (Communication Design) Club",
    aliases: ["Communication design club", "Communication Design Club"],
    url: "https://forms.gle/aGgX7tNXwanv9WaCA",
  },
  {
    club: "Humanique (HR Club)",
    aliases: ["Humanique Club", "Humanique"],
    url: "https://forms.cloud.microsoft/r/43GR43qs4p",
  },
  {
    club: "Just Naach (Dance Club)",
    aliases: ["Just naach", "Just Naach"],
    url: "https://forms.gle/58AqdDJwqNVAwJCT8",
  },
  {
    club: "Interior Design Club",
    aliases: ["Interior design club", "Interior Design Club"],
    url: "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=LSD36rPvekOhA1Bbufv3XxY9QHVPSqZNqI7pXt7LwuNUMTYzQUhKTFY5Uk9ZQlgyMk44S1Q3MUowMC4u",
  },
  {
    club: "Nexus Club",
    aliases: ["The Nexus Club", "Nexus Club"],
    url: "https://forms.cloud.microsoft/r/0G0U8Wcqss",
  },
  {
    club: "Rotaract Club",
    aliases: ["Rotaract club of Woxsen University", "Rotaract Club"],
    url: "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=LSD36rPvekOhA1Bbufv3X6eTDoGrD8FHrJQ8_v5Y8fJUNzRENU5RSVVNR0dETUJaWVZQVzVWVkxQNS4u",
  },
  {
    club: "Tantra (Operations Club)",
    aliases: ["Tantra"],
    url: "https://forms.cloud.microsoft/r/xf3rYMDBhX",
  },
  {
    club: "The Law Club",
    aliases: ["The Law Club"],
    url: "https://forms.cloud.microsoft/r/V1kq6HiQ4J",
  },
  {
    club: "The Literature Club",
    aliases: ["The Literature Club"],
    url: "https://forms.cloud.microsoft/r/pdEWpLjnX4",
  },
];

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

async function main() {
  const rows = await db.select().from(clubs);
  const byNorm = new Map(rows.map((row) => [normalize(row.name), row]));

  let updated = 0;
  let unchanged = 0;
  let skipped: string[] = [];
  const missing: string[] = [];

  for (const entry of CLUB_SIGNUP_LINKS) {
    let match: (typeof rows)[number] | undefined;
    for (const alias of [...entry.aliases, entry.club]) {
      match = byNorm.get(normalize(alias));
      if (match) break;
    }

    if (!match) {
      missing.push(entry.club);
      continue;
    }
    const existing = (match.joinUrl ?? "").trim();
    if (existing && existing !== entry.url && !PLACEHOLDER.test(existing)) {
      skipped.push(`${match.name} already has a real link: ${existing}`);
      continue;
    }
    if (existing === entry.url) {
      console.log(`= unchanged: ${match.name}`);
      unchanged += 1;
      continue;
    }
    await db.update(clubs).set({ joinUrl: entry.url }).where(eq(clubs.id, match.id));
    console.log(`✓ ${match.name} → ${entry.url}`);
    updated += 1;
  }

  console.log(
    `\nDone. updated=${updated} unchanged=${unchanged} skipped=${skipped.length}`,
  );
  for (const line of skipped) console.log(`  skipped: ${line}`);
  for (const club of missing) console.log(`  NOT FOUND in DB: ${club}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
