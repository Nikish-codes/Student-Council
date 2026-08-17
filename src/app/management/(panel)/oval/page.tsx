import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import { getOvalWeekRows } from "@/lib/oval-data";
import {
  addIsoDays,
  createEmptyWeek,
  formatOvalDate,
  getOvalServiceDate,
  getWeekStart,
} from "@/lib/oval-menu";
import { requireOvalManager } from "@/lib/rbac";
import { OvalWeekEditor } from "./oval-week-editor";

export const dynamic = "force-dynamic";

export default async function OvalManagementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOvalManager();
  const params = await searchParams;
  const serviceDate = getOvalServiceDate();
  const requested = typeof params.week === "string" ? params.week : serviceDate;
  const weekStart = getWeekStart(
    /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : serviceDate,
  );
  const rows = await getOvalWeekRows(weekStart);
  const initialWeek = createEmptyWeek(weekStart);
  const first = rows[0];
  if (first) {
    initialWeek.sourceName = first.sourceName ?? undefined;
    initialWeek.sourceMimeType = first.sourceMimeType ?? undefined;
    initialWeek.importMethod = first.importMethod;
  }
  const byDate = new Map(rows.map((row) => [row.menuDate, row]));
  initialWeek.days = initialWeek.days.map((day) => ({
    ...day,
    meals: byDate.get(day.menuDate)?.meals ?? day.meals,
  }));
  const statuses = Object.fromEntries(
    rows.map((row) => [
      row.menuDate,
      { status: row.status, approvedAt: row.approvedAt },
    ]),
  );
  const notice =
    params.saved === "1"
      ? "Weekly menu saved. Changed days are drafts until approved."
      : typeof params.approved === "string"
        ? `${formatOvalDate(params.approved)} approved for its 4:00 AM release.`
        : typeof params.draft === "string"
          ? `${formatOvalDate(params.draft)} returned to draft.`
          : undefined;

  return (
    <div className="space-y-9">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="kicker text-subtle">Dining · Oval</p>
          <h1 className="display mt-1 text-3xl">Weekly menu desk</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Week of {formatOvalDate(weekStart, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link
          href="/oval"
          target="_blank"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line/20 px-4 text-xs font-medium text-ink hover:border-line/45"
        >
          View public menu <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </header>

      <nav className="flex flex-wrap items-center justify-between gap-3 border-y border-line/10 py-3" aria-label="Choose menu week">
        <Link
          href={`/management/oval?week=${addIsoDays(weekStart, -7)}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-medium text-muted hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" /> Previous week
        </Link>
        <Link
          href={`/management/oval?week=${getWeekStart(serviceDate)}`}
          className="inline-flex min-h-10 items-center rounded-full border border-line/15 px-4 text-xs font-medium text-ink hover:border-line/40"
        >
          Current week
        </Link>
        <Link
          href={`/management/oval?week=${addIsoDays(weekStart, 7)}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-medium text-muted hover:text-ink"
        >
          Next week <ChevronRight className="h-4 w-4" />
        </Link>
      </nav>

      <OvalWeekEditor
        initialWeek={initialWeek}
        statuses={statuses}
        serviceDate={serviceDate}
        notice={notice}
      />
    </div>
  );
}
