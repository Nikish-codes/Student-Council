import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

const client = createClient({ url: "file::memory:" });
const database = drizzle(client, { schema });
vi.mock("@/db/client", () => ({
  get db() {
    return database;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error("REDIRECT:" + path);
  },
}));
vi.mock("@/lib/rbac", () => ({
  requireSportsManager: async () => ({ id: "1", role: "sports_lead" }),
  canPublishSports: () => true,
}));

beforeAll(async () => {
  for (const file of readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    for (const statement of readFileSync("drizzle/" + file, "utf8")
      .split("--> statement-breakpoint")
      .filter((s) => s.trim()))
      await client.execute(statement);
  }
});

describe("sports management and public results", () => {
  it("saves a winner-only tournament and league and preserves results in public getters", async () => {
    const { saveTournament } =
      await import("@/app/management/(panel)/sports/tournaments/actions");
    const { saveLeague } =
      await import("@/app/management/(panel)/sports/leagues/actions");
    const content = await import("@/lib/content");
    for (const [title, save, get] of [
      ["Singles cup", saveTournament, content.getSportsTournament],
      ["Singles league", saveLeague, content.getSportsLeague],
    ] as const) {
      const fd = new FormData();
      Object.entries({
        title,
        sport: "badminton",
        year: "2026",
        status: "published",
        participantType: "people",
        winnerName: "Asha",
        runnerUpName: "Ravi",
      }).forEach(([k, v]) => fd.set(k, v));
      await expect(save(null, fd)).rejects.toThrow("REDIRECT:");
      const result = await get(title.toLowerCase().replaceAll(" ", "-"));
      expect(result?.result).toMatchObject({
        winnerName: "Asha",
        participantType: "people",
      });
      expect(await database.query.sportsPeople.findMany()).toHaveLength(0);
    }
  });
  it("saves a final with free-entry players and exposes it only after competition publication", async () => {
    const [tournament] = await database
      .insert(schema.sportsTournaments)
      .values({
        title: "Private cup",
        slug: "private-cup",
        sport: "chess",
        year: 2026,
      })
      .returning();
    const { saveMatch } =
      await import("@/app/management/(panel)/sports/matches/actions");
    const { getSportsMatches } = await import("@/lib/content");
    const fd = new FormData();
    Object.entries({
      tournamentId: String(tournament.id),
      sport: "football",
      participantType: "people",
      participantAName: "Asha",
      participantBName: "Ravi",
      round: "Final",
      status: "finished",
      winnerName: "Asha",
    }).forEach(([k, v]) => fd.set(k, v));
    await expect(saveMatch(null, fd)).rejects.toThrow(
      "REDIRECT:/management/sports/tournaments/",
    );
    expect(await getSportsMatches({ tournamentId: tournament.id })).toEqual([]);
    await client.execute({
      sql: "UPDATE mp_sports_tournaments SET status = 'published' WHERE id = ?",
      args: [tournament.id],
    });
    const matches = await getSportsMatches({ tournamentId: tournament.id });
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      sport: "chess",
      round: "Final",
      teamAName: "Asha",
      teamBName: "Ravi",
      scoreA: undefined,
      scoreB: undefined,
      postMatch: { winnerName: "Asha" },
    });
    expect(await database.query.sportsPeople.findMany()).toHaveLength(0);
  });
});
