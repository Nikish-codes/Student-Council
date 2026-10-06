import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sportsMatches } from "@/db/schema";
import { inArray, eq, or } from "drizzle-orm";

export const revalidate = 5; // Edge cache for 5 seconds

export async function GET() {
  try {
    // Only fetch matches that are live or recently finished (though returning all isn't huge)
    // For simplicity and to handle state transitions (scheduled -> live -> finished),
    // we fetch ALL matches that aren't cancelled or just all of them.
    // The payload for ~200 matches is a few KB.
    const rows = await db.query.sportsMatches.findMany({
      columns: {
        id: true,
        status: true,
        scoreA: true,
        scoreB: true,
        postMatch: true,
      },
    });
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }
}
