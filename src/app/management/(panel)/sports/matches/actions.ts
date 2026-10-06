"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  sportsMatches as t,
  type SportMatchEvent,
  type SportPostMatch,
} from "@/db/schema";
import { requireSportsDelete, requireSportsManager } from "@/lib/rbac";
import type { SportType, SportMatchStatus } from "@/lib/schemas";
import { parseMatchParticipants } from "@/lib/sports-results";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
function optNum(fd: FormData, k: string): number | null {
  const v = s(fd, k);
  return v === "" ? null : Number(v);
}

function json<T>(fd: FormData, k: string, fallback: T): T {
  try {
    const v = s(fd, k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

const SPORTS: SportType[] = [
  "cue_stick",
  "chess",
  "carrom",
  "badminton",
  "table_tennis",
  "squash",
  "football",
  "futsal",
  "volleyball",
  "athletics",
  "pickleball",
  "basketball",
  "box_cricket",
  "throwball",
  "tennis",
];

const STATUSES: SportMatchStatus[] = [
  "scheduled",
  "live",
  "finished",
  "cancelled",
];

function bust(matchId?: number) {
  [
    "/sports",
    "/sports/calendar",
    "/management/sports",
    "/management/sports/matches",
  ].forEach((p) => revalidatePath(p));
  revalidatePath("/sports/tournaments/[slug]", "page");
  revalidatePath("/sports/leagues/[slug]", "page");
  if (matchId) revalidatePath(`/management/sports/matches/${matchId}`);
}

export async function saveMatch(id: number | null, fd: FormData) {
  await requireSportsManager();
  const sport = (
    SPORTS.includes(s(fd, "sport") as SportType) ? s(fd, "sport") : "football"
  ) as SportType;
  const status = (
    STATUSES.includes(s(fd, "status") as SportMatchStatus)
      ? s(fd, "status")
      : "scheduled"
  ) as SportMatchStatus;

  const tournamentId = optNum(fd, "tournamentId");
  const leagueId = optNum(fd, "leagueId");
  if (tournamentId && leagueId)
    throw new Error("Choose a tournament or a league, not both.");
  const competition = tournamentId
    ? await db.query.sportsTournaments.findFirst({
        where: (table, { eq }) => eq(table.id, tournamentId),
      })
    : leagueId
      ? await db.query.sportsLeagues.findFirst({
          where: (table, { eq }) => eq(table.id, leagueId),
        })
      : null;
  if ((tournamentId || leagueId) && !competition)
    throw new Error("Competition not found.");
  const score = (key: string) => {
    const value = optNum(fd, key);
    if (value !== null && (!Number.isInteger(value) || value < 0))
      throw new Error("Scores must be non-negative whole numbers.");
    return value;
  };
  const base = {
    tournamentId,
    // A match can have one competition parent. Prefer the tournament if a
    // stale or hand-crafted form submits both values.
    leagueId,
    sport: competition?.sport ?? sport,
    round: s(fd, "round") || null,
    ...parseMatchParticipants(fd),
    matchDate: s(fd, "matchDate") || null,
    venue: s(fd, "venue") || null,
    status,
    scoreA: score("scoreA"),
    scoreB: score("scoreB"),
    bannerImageId: optNum(fd, "bannerImageId"),
    events: json<SportMatchEvent[]>(fd, "events", []),
    postMatch: {
      ...json<SportPostMatch>(fd, "postMatch", {}),
      winnerName: s(fd, "winnerName").slice(0, 160) || undefined,
      winnerTitle: s(fd, "winnerTitle").slice(0, 500) || undefined,
    },
  };

  if (id) {
    const existing = await db.query.sportsMatches.findFirst({
      where: eq(t.id, id),
    });
    if (!existing) throw new Error("NOT_FOUND");
    await db
      .update(t)
      .set({ ...base, updatedAt: new Date().toISOString() })
      .where(eq(t.id, id));
    bust(id);
  } else {
    const [row] = await db
      .insert(t)
      .values({ ...base })
      .returning({ id: t.id });
    bust(row.id);
  }
  if (tournamentId) {
    revalidatePath(`/management/sports/tournaments/${tournamentId}`);
    redirect(`/management/sports/tournaments/${tournamentId}`);
  }
  if (leagueId) {
    revalidatePath(`/management/sports/leagues/${leagueId}`);
    redirect(`/management/sports/leagues/${leagueId}`);
  }
  redirect("/management/sports/matches");
}

/** Quick score update — used by the live scoring cockpit. */
export async function updateMatchScore(
  id: number,
  scoreA: number,
  scoreB: number,
  status: SportMatchStatus,
) {
  await requireSportsManager();
  await db
    .update(t)
    .set({ scoreA, scoreB, status, updatedAt: new Date().toISOString() })
    .where(eq(t.id, id));
  bust(id);
}

/** Append a match event (goal, card, etc.) for the live feed. */
export async function addMatchEvent(id: number, event: SportMatchEvent) {
  await requireSportsManager();
  const existing = await db.query.sportsMatches.findFirst({
    where: eq(t.id, id),
    columns: { events: true },
  });
  if (!existing) throw new Error("NOT_FOUND");
  const events = Array.isArray(existing.events) ? existing.events : [];
  events.push(event);
  await db
    .update(t)
    .set({ events, updatedAt: new Date().toISOString() })
    .where(eq(t.id, id));
  bust(id);
}

/** Remove a match event by index (for correcting mistakes in the cockpit). */
export async function removeMatchEvent(id: number, index: number) {
  await requireSportsManager();
  const existing = await db.query.sportsMatches.findFirst({
    where: eq(t.id, id),
    columns: { events: true },
  });
  if (!existing) throw new Error("NOT_FOUND");
  const events = Array.isArray(existing.events) ? existing.events : [];
  events.splice(index, 1);
  await db
    .update(t)
    .set({ events, updatedAt: new Date().toISOString() })
    .where(eq(t.id, id));
  bust(id);
}

export async function deleteMatch(id: number) {
  await requireSportsDelete();
  await db.delete(t).where(eq(t.id, id));
  bust();
}
