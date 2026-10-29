import { NextResponse } from "next/server";
import { getLiveScoresEnabled } from "@/lib/content";
import { liveScoreRows } from "@/lib/live-scores";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = (await getLiveScoresEnabled()) ? await liveScoreRows() : [];
    return NextResponse.json(rows, {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "CDN-Cache-Control": "public, s-maxage=3, stale-while-revalidate=10",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }
}
