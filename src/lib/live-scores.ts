import "server-only";
import { db } from "@/db/client";
import { putPublicR2Object } from "@/lib/r2";

export const LIVE_SCORES_KEY = "live/scores.json";

export function liveScoreRows() {
  return db.query.sportsMatches.findMany({
    columns: {
      id: true,
      status: true,
      scoreA: true,
      scoreB: true,
      postMatch: true,
      events: true,
    },
  });
}

export async function publishLiveScores(): Promise<void> {
  if (!process.env.R2_BUCKET || !process.env.R2_PUBLIC_URL) return;
  const config = await db.query.sportsPageConfig.findFirst({
    columns: { liveScoresEnabled: true },
  });
  if (!config?.liveScoresEnabled) return;
  try {
    await putPublicR2Object(
      LIVE_SCORES_KEY,
      JSON.stringify(await liveScoreRows()),
      "application/json",
      "public, max-age=2, s-maxage=2",
    );
  } catch (err) {
    console.error("[live-scores] publish failed", err);
  }
}
