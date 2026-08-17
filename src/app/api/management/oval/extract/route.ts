import { NextResponse } from "next/server";

import { extractSpreadsheetWeek, isSpreadsheetFile } from "@/lib/oval-ocr";
import { getWeekStart } from "@/lib/oval-menu";
import { rateLimit } from "@/lib/rate-limit";
import { requireOvalManager } from "@/lib/rbac";

export const runtime = "nodejs";
export const maxDuration = 240;

const MAX_BYTES = 15 * 1024 * 1024;
export async function POST(request: Request) {
  let user;
  try {
    user = await requireOvalManager();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`oval-ocr:${user.id}`, 6, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many extraction attempts. Please wait a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const requestedWeek = String(form.get("weekStart") ?? "").trim();
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Choose a menu file first" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is larger than 15 MB" },
      { status: 413 },
    );
  }
  if (!isSpreadsheetFile(file)) {
    return NextResponse.json(
      { error: "Images and PDFs are processed privately in your browser" },
      { status: 415 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedWeek)) {
    return NextResponse.json(
      { error: "Choose the week start date" },
      { status: 400 },
    );
  }
  const weekStart = getWeekStart(requestedWeek);
  if (weekStart !== requestedWeek) {
    return NextResponse.json(
      { error: "Week start must be a Monday" },
      { status: 400 },
    );
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const week = extractSpreadsheetWeek(
      bytes,
      weekStart,
      file.name,
      file.type || "application/octet-stream",
    );
    return NextResponse.json({ week });
  } catch (error) {
    console.error("[oval/extract] failed:", error);
    const message =
      error instanceof Error ? error.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
