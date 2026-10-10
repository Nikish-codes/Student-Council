"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  sportsMatches as t,
  type SportDisplayOverlay,
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
  if (matchId) {
    revalidatePath(`/management/sports/matches/${matchId}`);
    revalidatePath(`/sports/matches/${matchId}`);
    revalidatePath(`/display/matches/${matchId}`);
  }
  revalidatePath("/sports/matches/[id]", "page");
  revalidatePath("/display/matches/[id]", "page");
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

/** Quick timer update — used by the live scoring cockpit. */
export async function updateMatchTimer(id: number, timer: import("@/lib/schemas").SportMatchTimer) {
  await requireSportsManager();
  const existing = await db.query.sportsMatches.findFirst({
    where: eq(t.id, id),
    columns: { postMatch: true },
  });
  if (!existing) throw new Error("NOT_FOUND");
  
  const postMatch = existing.postMatch || {};
  postMatch.timer = timer;

  await db
    .update(t)
    .set({ postMatch, updatedAt: new Date().toISOString() })
    .where(eq(t.id, id));
  bust(id);
}

const SCORING_TYPES = new Set(["goal", "own_goal", "penalty_goal"]);

export type MatchEventInput = {
  type: string;
  team: "a" | "b";
  time?: string;
  player?: string;
  jersey?: string;
  assist?: string;
  description?: string;
  celebrate?: boolean;
  style?: "takeover" | "flourish";
  countsOnScoreboard?: boolean;
};

function describe(input: MatchEventInput): string | undefined {
  if (input.description?.trim()) return input.description.trim();
  const player = input.player?.trim();
  if (!player) return undefined;
  return input.jersey?.trim() ? `${player} [${input.jersey.trim()}]` : player;
}

export async function logMatchEvent(id: number, input: MatchEventInput) {
  await requireSportsManager();
  const existing = await db.query.sportsMatches.findFirst({
    where: eq(t.id, id),
    columns: { events: true, scoreA: true, scoreB: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  const event: SportMatchEvent = {
    id: crypto.randomUUID(),
    time: input.time?.trim() || "",
    team: input.team,
    type: input.type,
    description: describe(input),
    player: input.player?.trim() || undefined,
    jersey: input.jersey?.trim() || undefined,
    assist: input.assist?.trim() || undefined,
    celebrate: input.celebrate !== false,
    style: input.style,
  };

  const events = Array.isArray(existing.events) ? [...existing.events] : [];
  events.push(event);

  const patch: {
    events: SportMatchEvent[];
    scoreA?: number;
    scoreB?: number;
    updatedAt: string;
  } = { events, updatedAt: new Date().toISOString() };

  if (SCORING_TYPES.has(input.type) && input.countsOnScoreboard !== false) {
    const credited =
      input.type === "own_goal" ? (input.team === "a" ? "b" : "a") : input.team;
    if (credited === "a") patch.scoreA = (existing.scoreA ?? 0) + 1;
    else patch.scoreB = (existing.scoreB ?? 0) + 1;
  }

  await db.update(t).set(patch).where(eq(t.id, id));
  bust(id);
}

export async function replayMatchEvent(id: number, eventId: string) {
  await requireSportsManager();
  const existing = await db.query.sportsMatches.findFirst({
    where: eq(t.id, id),
    columns: { events: true },
  });
  if (!existing) throw new Error("NOT_FOUND");
  const events = Array.isArray(existing.events) ? [...existing.events] : [];
  const source = events.find((e) => e.id === eventId);
  if (!source) return;
  events.push({
    ...source,
    id: crypto.randomUUID(),
    celebrate: true,
    replay: true,
  });
  await db
    .update(t)
    .set({ events, updatedAt: new Date().toISOString() })
    .where(eq(t.id, id));
  bust(id);
}

export async function removeMatchEventById(id: number, eventId: string) {
  await requireSportsManager();
  const existing = await db.query.sportsMatches.findFirst({
    where: eq(t.id, id),
    columns: { events: true },
  });
  if (!existing) throw new Error("NOT_FOUND");
  const events = Array.isArray(existing.events) ? existing.events : [];
  await db
    .update(t)
    .set({
      events: events.filter((e) => e.id !== eventId),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(t.id, id));
  bust(id);
}

export async function setMatchOverlay(id: number, overlay: SportDisplayOverlay) {
  await requireSportsManager();
  const existing = await db.query.sportsMatches.findFirst({
    where: eq(t.id, id),
    columns: { postMatch: true },
  });
  if (!existing) throw new Error("NOT_FOUND");
  const postMatch: SportPostMatch = existing.postMatch || {};
  postMatch.overlay =
    overlay.kind === "none"
      ? { kind: "none" }
      : { ...overlay, since: overlay.since ?? Date.now() };
  await db
    .update(t)
    .set({ postMatch, updatedAt: new Date().toISOString() })
    .where(eq(t.id, id));
  bust(id);
}

export async function setMatchGoalStyle(
  id: number,
  goalStyle: "takeover" | "flourish",
) {
  await requireSportsManager();
  const existing = await db.query.sportsMatches.findFirst({
    where: eq(t.id, id),
    columns: { postMatch: true },
  });
  if (!existing) throw new Error("NOT_FOUND");
  const postMatch: SportPostMatch = existing.postMatch || {};
  postMatch.goalStyle = goalStyle;
  await db
    .update(t)
    .set({ postMatch, updatedAt: new Date().toISOString() })
    .where(eq(t.id, id));
  bust(id);
}
