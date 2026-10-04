import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { sportsMatches, sportsTeams, sportsLeagues } from "../src/db/schema";

const raw = createClient({
  url: process.env.LIBSQL_URL!,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});
const db = drizzle(raw, { schema });

const TEAMS = [
  { name: "Great Gaffers", slug: "great-gaffers" },
  { name: "Blazing Legacy", slug: "blazing-legacy" },
  { name: "Clovers", slug: "clovers" },
  { name: "Boran", slug: "boran" },
  { name: "Shuttle Strikers", slug: "shuttle-strikers" },
  { name: "Net Dominator", slug: "net-dominator" },
];

const MATCHES = [
  // DAY 1
  {
    day: "DAY 1",
    date: "2026-09-22T18:00",
    teamA: "Great Gaffers",
    teamB: "Blazing Legacy",
    scoreA: 3,
    scoreB: 2,
    winner: "Great Gaffers",
    rubbers: "M1: 2-0 · M2: 2-0 · M3: 2-0 · M4: 0-2 · M5: 0-2",
  },
  {
    day: "DAY 1",
    date: "2026-09-22T19:30",
    teamA: "Clovers",
    teamB: "Boran",
    scoreA: 1,
    scoreB: 3,
    winner: "Boran",
    rubbers: "M1: 2-1 · M2: 0-2 · M3: 0-2 · M4: 1-2",
  },
  // DAY 2
  {
    day: "DAY 2",
    date: "2026-09-23T18:00",
    teamA: "Shuttle Strikers",
    teamB: "Great Gaffers",
    scoreA: 4,
    scoreB: 1,
    winner: "Shuttle Strikers",
    rubbers: "M1: 2-0 · M2: 0-2 · M3: 2-0 · M4: 2-0 · M5: 2-0",
  },
  {
    day: "DAY 2",
    date: "2026-09-23T19:30",
    teamA: "Blazing Legacy",
    teamB: "Boran",
    scoreA: 3,
    scoreB: 2,
    winner: "Blazing Legacy",
    rubbers: "M1: 2-0 · M2: 0-2 · M3: 2-0 · M4: 2-0 · M5: 0-2",
  },
  {
    day: "DAY 2",
    date: "2026-09-23T21:00",
    teamA: "Clovers",
    teamB: "Net Dominator",
    scoreA: 2,
    scoreB: 3,
    winner: "Net Dominator",
    rubbers: "M1: 2-1 · M2: 0-2 · M3: 2-0 · M4: 0-2 · M5: 1-2",
  },
  // DAY 3
  {
    day: "DAY 3",
    date: "2026-09-24T18:00",
    teamA: "Great Gaffers",
    teamB: "Net Dominator",
    scoreA: 3,
    scoreB: 2,
    winner: "Great Gaffers",
    rubbers: "M1: 2-1 · M2: 2-1 · M3: 0-2 · M4: 2-0 · M5: 0-2",
  },
  {
    day: "DAY 3",
    date: "2026-09-24T19:30",
    teamA: "Blazing Legacy",
    teamB: "Clovers",
    scoreA: 2,
    scoreB: 3,
    winner: "Clovers",
    rubbers: "M1: 2-1 · M2: 2-0 · M3: 0-2 · M4: 0-2 · M5: 0-2",
  },
  {
    day: "DAY 3",
    date: "2026-09-24T21:00",
    teamA: "Shuttle Strikers",
    teamB: "Boran",
    scoreA: 3,
    scoreB: 2,
    winner: "Shuttle Strikers",
    rubbers: "M1: 2-0 · M2: 1-2 · M3: 2-0 · M4: 0-2 · M5: 2-0",
  },
];

async function main() {
  const league = await db.query.sportsLeagues.findFirst({
    where: eq(sportsLeagues.slug, "woxsen-badminton-league"),
  });

  if (!league) {
    console.error("Woxsen Badminton League not found in database!");
    process.exit(1);
  }
  console.log(`Found League: ${league.title} (ID: ${league.id})`);

  // 1. Ensure teams exist
  const teamIdMap = new Map<string, number>();
  for (const t of TEAMS) {
    let existing = await db.query.sportsTeams.findFirst({
      where: eq(sportsTeams.slug, t.slug),
    });
    let teamId: number;
    if (!existing) {
      const [inserted] = await db
        .insert(sportsTeams)
        .values({
          name: t.name,
          slug: t.slug,
        })
        .returning({ id: sportsTeams.id, name: sportsTeams.name });
      teamId = inserted.id;
      console.log(`Created team: ${t.name} (ID: ${teamId})`);
    } else {
      teamId = existing.id;
      console.log(`Existing team: ${t.name} (ID: ${teamId})`);
    }
    teamIdMap.set(t.name, teamId);
  }

  // 2. Insert matches
  for (const m of MATCHES) {
    const teamAId = teamIdMap.get(m.teamA);
    const teamBId = teamIdMap.get(m.teamB);

    const [inserted] = await db
      .insert(sportsMatches)
      .values({
        leagueId: league.id,
        sport: "badminton",
        round: m.day,
        participantType: "teams",
        participantAName: m.teamA,
        participantBName: m.teamB,
        teamAId,
        teamBId,
        matchDate: m.date,
        venue: league.venue || "Sportx",
        status: "finished",
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        postMatch: {
          winnerName: m.winner,
          winnerTitle: `Won ${Math.max(m.scoreA, m.scoreB)}-${Math.min(m.scoreA, m.scoreB)} (${m.rubbers})`,
        },
      })
      .returning({ id: sportsMatches.id });

    console.log(
      `Inserted match ${inserted.id}: ${m.day} · ${m.teamA} (${m.scoreA}) vs ${m.teamB} (${m.scoreB})`,
    );
  }

  // 3. Compute and update standings table
  const standings = [
    { position: 1, teamName: "Shuttle Strikers", played: 2, won: 2, lost: 0, drawn: 0, points: 4 },
    { position: 2, teamName: "Great Gaffers", played: 3, won: 2, lost: 1, drawn: 0, points: 4 },
    { position: 3, teamName: "Net Dominator", played: 2, won: 1, lost: 1, drawn: 0, points: 2 },
    { position: 4, teamName: "Clovers", played: 3, won: 1, lost: 2, drawn: 0, points: 2 },
    { position: 5, teamName: "Boran", played: 3, won: 1, lost: 2, drawn: 0, points: 2 },
    { position: 6, teamName: "Blazing Legacy", played: 3, won: 1, lost: 2, drawn: 0, points: 2 },
  ];

  await db
    .update(sportsLeagues)
    .set({
      standings,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(sportsLeagues.id, league.id));

  console.log("Updated Woxsen Badminton League standings table!");
  console.log("Done! All matches and standings are live.");
}

main().catch(console.error);
