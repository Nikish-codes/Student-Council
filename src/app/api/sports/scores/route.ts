import { NextResponse } from "next/server";
import { db } from "@/db/client";

export const dynamic = "force-dynamic"; // NO CACHING. Real-time for live matches!
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await db.query.sportsMatches.findMany({
      columns: {
        id: true,
        status: true,
        scoreA: true,
        scoreB: true,
        postMatch: true,
        events: true,
      },
    });
    
    // Add custom headers to explicitly tell browser and CDN NOT to cache this ever.
    const headers = new Headers();
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    headers.set("Surrogate-Control", "no-store");
    
    return NextResponse.json(rows, { headers });
  } catch {
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }
}
