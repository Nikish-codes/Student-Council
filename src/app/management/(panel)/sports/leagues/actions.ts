"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sportsLeagues as t, type SportStandingRow } from "@/db/schema";
import {
  requireSportsDelete,
  requireSportsManager,
  canPublishSports,
} from "@/lib/rbac";
import { uniqueSlug, slugify } from "@/lib/slug";
import { parseCompetitionResult } from "@/lib/sports-results";
import type {
  SportType,
  SportDivision,
  SportCompetitionStatus,
} from "@/lib/schemas";

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

function resolveStatus(
  requested: string,
  role: Parameters<typeof canPublishSports>[0],
): SportCompetitionStatus {
  const status = (
    ["draft", "pending_review", "published", "archived"].includes(requested)
      ? requested
      : "draft"
  ) as SportCompetitionStatus;
  if (status === "published" && !canPublishSports(role))
    return "pending_review";
  return status;
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

const DIVISIONS: SportDivision[] = [
  "male",
  "female",
  "mixed",
  "open",
  "3v3_male",
  "3v3_female",
];

function bust(...slugs: (string | undefined)[]) {
  [
    "/sports",
    "/sports/calendar",
    "/sports/leagues",
    "/management/sports",
    "/management/sports/leagues",
  ].forEach((p) => revalidatePath(p));
  for (const slug of slugs) if (slug) revalidatePath(`/sports/leagues/${slug}`);
}

export async function saveLeague(id: number | null, fd: FormData) {
  const user = await requireSportsManager();
  const sport = (
    SPORTS.includes(s(fd, "sport") as SportType) ? s(fd, "sport") : "football"
  ) as SportType;
  const division = (
    DIVISIONS.includes(s(fd, "division") as SportDivision)
      ? s(fd, "division")
      : "open"
  ) as SportDivision;
  const status = resolveStatus(s(fd, "status"), user.role);
  const justPublished = id ? false : status === "published";

  const base = {
    result: parseCompetitionResult(fd),
    title: s(fd, "title"),
    sport,
    division,
    year: Number(s(fd, "year")) || new Date().getFullYear(),
    venue: s(fd, "venue") || null,
    startDate: s(fd, "startDate") || null,
    endDate: s(fd, "endDate") || null,
    bannerId: optNum(fd, "bannerId"),
    excerpt: s(fd, "excerpt"),
    description: s(fd, "description"),
    featured: fd.get("featured") === "on",
    status,
    publishedAt:
      justPublished || (id && status === "published")
        ? new Date().toISOString()
        : null,
    standings: json<SportStandingRow[]>(fd, "standings", []).filter((r) =>
      r?.teamName?.trim(),
    ),
  };

  let slug: string;
  if (id) {
    const existing = await db.query.sportsLeagues.findFirst({
      where: eq(t.id, id),
    });
    if (!existing) throw new Error("NOT_FOUND");
    const requested = s(fd, "slug");
    slug =
      requested && slugify(requested) !== existing.slug
        ? await uniqueSlug("sportsLeagues", requested, id)
        : existing.slug;
    const prevPublished = existing.publishedAt;
    await db
      .update(t)
      .set({
        ...base,
        slug,
        publishedAt:
          status === "published" && !prevPublished
            ? new Date().toISOString()
            : prevPublished,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(t.id, id));
    bust(slug, existing.slug);
  } else {
    slug = await uniqueSlug("sportsLeagues", s(fd, "slug") || base.title);
    await db.insert(t).values({ ...base, slug });
    bust(slug);
  }
  redirect("/management/sports/leagues");
}

export async function deleteLeague(id: number) {
  await requireSportsDelete();
  const existing = await db.query.sportsLeagues.findFirst({
    where: eq(t.id, id),
    columns: { slug: true },
  });
  await db.delete(t).where(eq(t.id, id));
  bust(existing?.slug);
}
