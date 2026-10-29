import "server-only";

import * as XLSX from "xlsx";

import type { OvalMealId } from "@/db/schema";
import {
  OVAL_MATRIX_SECTIONS,
  matchesOvalMatrixLabel,
  normalizeOvalMatrixLabel,
} from "@/lib/oval-matrix";
import {
  OVAL_MEALS,
  OVAL_WEEKDAYS,
  addIsoDays,
  createEmptyWeek,
  formatOvalDate,
  getWeekStart,
  makeOvalItem,
  ovalWeekDraftSchema,
  type OvalWeekDraft,
} from "@/lib/oval-menu";

const SPREADSHEET_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "text/tab-separated-values",
]);

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const SECTION_HEADERS: Record<string, "BREAKFAST" | "LUNCH" | "DINNER"> = {
  BREAKFAST: "BREAKFAST",
  "BREAKFAST MENU": "BREAKFAST",
  LUNCH: "LUNCH",
  "LUNCH MENU": "LUNCH",
  "JAIN LUNCH": "LUNCH",
  "JAIN LUNCH MENU": "LUNCH",
  DINNER: "DINNER",
  "DINNER MENU": "DINNER",
  "JAIN DINNER": "DINNER",
  "JAIN DINNER MENU": "DINNER",
};

export class OvalWeekMismatchError extends Error {
  constructor(
    readonly weekStart: string,
    message: string,
  ) {
    super(message);
  }
}

function cleanOvalCell(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function isBlankMenuCell(value: string): boolean {
  return !value || !/[a-z0-9]/i.test(value) || /^[-–—*\s]+$/.test(value);
}

function sectionHeaderOf(value: string) {
  return SECTION_HEADERS[normalizeOvalMatrixLabel(value)];
}

function isWeekdayCell(value: string, day: string): boolean {
  const normalized = normalizeOvalMatrixLabel(value);
  const name = day.toUpperCase();
  return (
    normalized === name ||
    normalized === name.slice(0, 3) ||
    normalized.startsWith(`${name} `)
  );
}

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length];
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(
      /(^|[\s/(&-])([a-z])/g,
      (_, lead, letter) => lead + letter.toUpperCase(),
    );
}

function resolveCategory(meal: OvalMealId, label: string) {
  const section = OVAL_MATRIX_SECTIONS.find((item) => item.meal === meal);
  const normalized = normalizeOvalMatrixLabel(label);
  const categories = section?.categories ?? [];
  const exact = categories.find((category) =>
    matchesOvalMatrixLabel(label, category.canonical, category.aliases),
  );
  if (exact) return exact;
  const tolerance = normalized.length >= 8 ? 2 : normalized.length >= 5 ? 1 : 0;
  if (!tolerance) return undefined;
  return categories.find((category) =>
    [category.canonical, ...(category.aliases ?? [])].some(
      (candidate) =>
        editDistance(normalized, normalizeOvalMatrixLabel(candidate)) <=
        tolerance,
    ),
  );
}

type DateCandidate = { year?: number; month: number; day: number };

function parseSheetDate(value: string): DateCandidate[] {
  const text = OVAL_WEEKDAYS.reduce(
    (current, day) =>
      current.replace(
        new RegExp(`\\b${day}\\b|\\b${day.slice(0, 3)}\\b`, "i"),
        "",
      ),
    value,
  )
    .replace(/(\d)(st|nd|rd|th)\b/gi, "$1")
    .trim();
  const monthIndex = (name: string) =>
    MONTHS.indexOf(name.slice(0, 3).toUpperCase()) + 1;
  const year = (raw?: string) =>
    raw ? (raw.length === 2 ? 2000 + Number(raw) : Number(raw)) : undefined;

  let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match)
    return [
      {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
      },
    ];
  match = text.match(
    /^(\d{1,2})[\s\-/.]*([A-Za-z]{3,9})\.?[\s\-/.,]*(\d{2,4})?$/,
  );
  if (match && monthIndex(match[2]) > 0)
    return [
      {
        year: year(match[3]),
        month: monthIndex(match[2]),
        day: Number(match[1]),
      },
    ];
  match = text.match(
    /^([A-Za-z]{3,9})\.?[\s\-/.]*(\d{1,2})(?:[\s,\-/.]+(\d{2,4}))?$/,
  );
  if (match && monthIndex(match[1]) > 0)
    return [
      {
        year: year(match[3]),
        month: monthIndex(match[1]),
        day: Number(match[2]),
      },
    ];
  match = text.match(/^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?$/);
  if (match) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    return [
      { year: year(match[3]), month: b, day: a },
      { year: year(match[3]), month: a, day: b },
    ];
  }
  return [];
}

function candidateIso(candidate: DateCandidate, near: string): string | null {
  if (
    candidate.month < 1 ||
    candidate.month > 12 ||
    candidate.day < 1 ||
    candidate.day > 31
  )
    return null;
  const nearYear = Number(near.slice(0, 4));
  const years = candidate.year
    ? [candidate.year]
    : [nearYear - 1, nearYear, nearYear + 1];
  let best: string | null = null;
  let bestGap = Infinity;
  for (const y of years) {
    const iso = `${y}-${String(candidate.month).padStart(2, "0")}-${String(candidate.day).padStart(2, "0")}`;
    const time = new Date(`${iso}T00:00:00.000Z`).getTime();
    if (Number.isNaN(time) || new Date(time).getUTCDate() !== candidate.day)
      continue;
    const gap = Math.abs(time - new Date(`${near}T00:00:00.000Z`).getTime());
    if (gap < bestGap) {
      best = iso;
      bestGap = gap;
    }
  }
  return best;
}

function detectSheetWeek(
  rows: readonly string[][],
  headerIndex: number,
  dayColumns: readonly number[],
  selectedWeek: string,
): string | null {
  const votes = new Map<string, number>();
  for (
    let index = headerIndex;
    index < Math.min(rows.length, headerIndex + 4);
    index += 1
  ) {
    dayColumns.forEach((column, dayIndex) => {
      for (const candidate of parseSheetDate(rows[index][column] ?? "")) {
        const iso = candidateIso(candidate, selectedWeek);
        if (!iso) continue;
        const monday = addIsoDays(iso, -dayIndex);
        if (getWeekStart(monday) !== monday) continue;
        votes.set(monday, (votes.get(monday) ?? 0) + 1);
      }
    });
  }
  let best: string | null = null;
  let bestVotes = 0;
  for (const [monday, count] of votes) {
    if (count > bestVotes) {
      best = monday;
      bestVotes = count;
    }
  }
  return bestVotes >= 3 ? best : null;
}

/**
 * Parse the mess committee's DAY → MEAL → ITEM sheet. Sections and categories
 * are found by their labels, so typos, missing or extra rows, a missing DATE
 * label, or a moved Jain block do not reject the whole week.
 */
export function extractSpreadsheetRowsWeek(
  rows: string[][],
  weekStart: string,
  sourceName: string,
  sourceMimeType: string,
  warnings: string[] = [],
): OvalWeekDraft {
  const headerIndex = rows.findIndex((row) =>
    OVAL_WEEKDAYS.every((day) => row.some((cell) => isWeekdayCell(cell, day))),
  );
  if (headerIndex < 0) {
    throw new Error(
      "Could not find a row with Monday to Sunday as column headings. Upload the mess's weekly menu sheet.",
    );
  }

  const header = rows[headerIndex];
  const dayColumns = OVAL_WEEKDAYS.map((day) =>
    header.findIndex((cell) => isWeekdayCell(cell, day)),
  );
  if (new Set(dayColumns).size !== 7) {
    throw new Error("Each weekday must have its own column.");
  }
  const firstDayColumn = Math.min(...dayColumns);
  if (firstDayColumn < 1) {
    throw new Error(
      "The first column must hold the row labels (Eggs, Salad, Lentil…), with Monday to Sunday after it.",
    );
  }
  const labelColumns = Array.from(
    { length: firstDayColumn },
    (_, index) => index,
  );

  const sheetWeek = detectSheetWeek(rows, headerIndex, dayColumns, weekStart);
  if (sheetWeek && sheetWeek !== weekStart) {
    const range = (start: string) =>
      `${formatOvalDate(start, { day: "numeric", month: "short" })} – ${formatOvalDate(addIsoDays(start, 6), { day: "numeric", month: "short" })}`;
    throw new OvalWeekMismatchError(
      sheetWeek,
      `This sheet is for the week of ${range(sheetWeek)}, but you're on ${range(weekStart)}. Open that week and import again.`,
    );
  }
  if (!sheetWeek) {
    warnings.push(
      "No dates were found in the sheet, so it was imported into the week you have open. Check the dates before saving.",
    );
  }

  const week = createEmptyWeek(weekStart, "spreadsheet");
  week.sourceName = sourceName;
  week.sourceMimeType = sourceMimeType;

  const seen = new Set<OvalMealId>();
  const unknownLabels = new Set<string>();
  let meal: OvalMealId | null = null;
  let jain = false;
  let lastLabel = "";

  for (const row of rows.slice(headerIndex + 1)) {
    const label =
      labelColumns.map((column) => cleanOvalCell(row[column])).find(Boolean) ??
      "";
    const dayCells = dayColumns.map((column) => cleanOvalCell(row[column]));
    const dishes = dayCells.map((cell) =>
      isBlankMenuCell(cell) || sectionHeaderOf(cell) ? "" : cell,
    );

    const headerWord =
      sectionHeaderOf(label) ??
      (!label
        ? dayCells
            .filter(Boolean)
            .map(sectionHeaderOf)
            .find((value) => value !== undefined)
        : undefined);
    const mentionsJain = row.some((cell) => /\bjain\b/i.test(cell));
    if (mentionsJain && (headerWord || dishes.every((dish) => !dish)))
      jain = true;
    if (headerWord) {
      if (headerWord === "BREAKFAST") meal = "breakfast";
      else if (headerWord === "LUNCH")
        meal = jain || seen.has("lunch") ? "jain_lunch" : "lunch";
      else
        meal =
          jain || seen.has("jain_lunch") || seen.has("dinner")
            ? "jain_dinner"
            : "dinner";
      seen.add(meal);
      lastLabel = "";
      continue;
    }
    if (!meal) continue;

    if (dishes.every((dish) => !dish)) {
      if (label) lastLabel = label;
      continue;
    }
    const rowLabel = label || lastLabel;
    lastLabel = rowLabel;
    const category = rowLabel ? resolveCategory(meal, rowLabel) : undefined;
    const templateDisplay =
      labelColumns.length > 1 ? cleanOvalCell(row[1]) : "";
    const displayCategory = (
      category
        ? templateDisplay || category.display
        : titleCase(rowLabel || "Other")
    ).slice(0, 100);
    if (!category) unknownLabels.add(displayCategory);

    dishes.forEach((dish, dayIndex) => {
      if (!dish) return;
      week.days[dayIndex].meals[meal!].push(
        makeOvalItem(displayCategory, dish.slice(0, 300), {
          confidence: category ? 1 : 0.8,
          needsReview: !category,
          sourceText: dish.slice(0, 500),
        }),
      );
    });
  }

  const total = week.days.reduce(
    (sum, day) =>
      sum +
      OVAL_MEALS.reduce((count, item) => count + day.meals[item.id].length, 0),
    0,
  );
  if (total === 0) {
    throw new Error(
      "No dishes were found. The sheet needs Breakfast, Lunch and Dinner rows under the Monday to Sunday columns.",
    );
  }
  for (const item of OVAL_MEALS) {
    if (!week.days.some((day) => day.meals[item.id].length > 0)) {
      warnings.push(`No ${item.label} section was found in the sheet.`);
    }
  }
  if (unknownLabels.size > 0) {
    warnings.push(
      `Unfamiliar row names kept as-is and flagged for review: ${[...unknownLabels].join(", ")}.`,
    );
  }

  return ovalWeekDraftSchema.parse(week);
}

/** Read real spreadsheet cells directly; OCR would only reduce their accuracy. */
export function extractSpreadsheetWeek(
  bytes: Uint8Array,
  weekStart: string,
  sourceName: string,
  sourceMimeType: string,
  warnings: string[] = [],
): OvalWeekDraft {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, { type: "array", cellDates: true });
  } catch {
    throw new Error(
      "This file could not be opened as a spreadsheet. Re-save it from Excel or Google Sheets as .xlsx and try again.",
    );
  }
  const sheets = workbook.SheetNames.map((name) =>
    XLSX.utils
      .sheet_to_json<unknown[]>(workbook.Sheets[name], {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      })
      .map((row) => row.map(cleanOvalCell)),
  );
  if (sheets.length === 0) throw new Error("The spreadsheet has no sheets");
  const rows =
    sheets.find((sheet) =>
      sheet.some((row) =>
        OVAL_WEEKDAYS.every((day) =>
          row.some((cell) => isWeekdayCell(cell, day)),
        ),
      ),
    ) ?? sheets[0];
  return extractSpreadsheetRowsWeek(
    rows,
    weekStart,
    sourceName,
    sourceMimeType,
    warnings,
  );
}

export function isSpreadsheetFile(file: File): boolean {
  return (
    SPREADSHEET_MIMES.has(file.type) || /\.(xlsx?|csv|tsv)$/i.test(file.name)
  );
}
