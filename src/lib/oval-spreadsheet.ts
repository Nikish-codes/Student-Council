import "server-only";

import * as XLSX from "xlsx";

import {
  OVAL_MATRIX_SECTIONS,
  matchesOvalMatrixLabel,
} from "@/lib/oval-matrix";
import {
  OVAL_WEEKDAYS,
  createEmptyWeek,
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

function cleanOvalCell(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function isBlankMenuCell(value: string): boolean {
  return !value || !/[a-z0-9]/i.test(value) || /^[-–—*\s]+$/.test(value);
}

function rowHasLabel(
  row: readonly string[],
  labelColumns: readonly number[],
  canonical: string,
  aliases: readonly string[] = [],
): boolean {
  return labelColumns.some((column) =>
    matchesOvalMatrixLabel(row[column], canonical, aliases),
  );
}

function findRequiredHeader(
  rows: readonly string[][],
  start: number,
  labelColumns: readonly number[],
  canonical: string,
  aliases: readonly string[] = [],
): number {
  // The template may contain the DATE row before Breakfast, but no section
  // may float arbitrarily: a nearby bounded search catches accidental shifts.
  const end = Math.min(rows.length, start + 4);
  for (let index = start; index < end; index += 1) {
    if (rowHasLabel(rows[index], labelColumns, canonical, aliases))
      return index;
  }
  throw new Error(
    `Expected “${canonical}” near spreadsheet row ${start + 1}. Use the standard Oval weekly-menu template.`,
  );
}

/** Parse the committee's fixed DAY → MEAL → ITEM matrix without OCR. */
export function extractSpreadsheetRowsWeek(
  rows: string[][],
  weekStart: string,
  sourceName: string,
  sourceMimeType: string,
): OvalWeekDraft {
  const headerIndex = rows.findIndex((row) =>
    OVAL_WEEKDAYS.every((day) =>
      row.some((cell) => matchesOvalMatrixLabel(cell, day)),
    ),
  );
  if (headerIndex < 0) {
    throw new Error(
      "Could not find one header row containing Monday through Sunday.",
    );
  }

  const dayColumns = OVAL_WEEKDAYS.map((day) =>
    rows[headerIndex].findIndex((cell) => matchesOvalMatrixLabel(cell, day)),
  );
  if (
    new Set(dayColumns).size !== 7 ||
    dayColumns.some((column) => column < 0)
  ) {
    throw new Error("Each weekday must have its own spreadsheet column.");
  }
  const firstDayColumn = Math.min(...dayColumns);
  if (firstDayColumn < 1) {
    throw new Error("The weekday columns must follow the row-label columns.");
  }
  const labelColumns = Array.from(
    { length: firstDayColumn },
    (_, index) => index,
  );
  const week = createEmptyWeek(weekStart, "spreadsheet");
  week.sourceName = sourceName;
  week.sourceMimeType = sourceMimeType;

  const dateRowIndex = findRequiredHeader(
    rows,
    headerIndex + 1,
    labelColumns,
    "DATE",
  );
  for (let dayIndex = 0; dayIndex < dayColumns.length; dayIndex += 1) {
    const expectedDate = new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
    }).format(new Date(`${week.days[dayIndex].menuDate}T12:00:00.000Z`));
    const workbookDate = rows[dateRowIndex][dayColumns[dayIndex]];
    if (!matchesOvalMatrixLabel(workbookDate, expectedDate)) {
      throw new Error(
        `${OVAL_WEEKDAYS[dayIndex]}'s sheet date is “${workbookDate || "blank"}”, but the selected week expects ${expectedDate}. Open the matching week before importing.`,
      );
    }
  }

  let cursor = dateRowIndex + 1;
  for (const section of OVAL_MATRIX_SECTIONS) {
    if (section.parentHeader) {
      cursor =
        findRequiredHeader(rows, cursor, labelColumns, section.parentHeader) +
        1;
    }
    const sectionRow = findRequiredHeader(
      rows,
      cursor,
      labelColumns,
      section.header,
      section.headerAliases,
    );
    cursor = sectionRow + 1;

    for (const category of section.categories) {
      const row = rows[cursor];
      if (!row) {
        throw new Error(
          `The sheet ended before ${section.header} → ${category.display}.`,
        );
      }
      if (
        !rowHasLabel(row, labelColumns, category.canonical, category.aliases)
      ) {
        throw new Error(
          `Expected “${category.display}” at spreadsheet row ${cursor + 1}. Do not add, remove, or reorder template rows.`,
        );
      }
      const workbookCategory = cleanOvalCell(row[1]);
      const displayCategory = workbookCategory || category.display;
      for (let dayIndex = 0; dayIndex < dayColumns.length; dayIndex += 1) {
        const dish = cleanOvalCell(row[dayColumns[dayIndex]]);
        if (isBlankMenuCell(dish)) continue;
        week.days[dayIndex].meals[section.meal].push(
          makeOvalItem(displayCategory, dish, {
            confidence: 1,
            needsReview: false,
            sourceText: dish,
          }),
        );
      }
      cursor += 1;
    }
  }

  return ovalWeekDraftSchema.parse(week);
}

/** Read real spreadsheet cells directly; OCR would only reduce their accuracy. */
export function extractSpreadsheetWeek(
  bytes: Uint8Array,
  weekStart: string,
  sourceName: string,
  sourceMimeType: string,
): OvalWeekDraft {
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error("The spreadsheet has no sheets");
  const values = XLSX.utils.sheet_to_json<unknown[]>(
    workbook.Sheets[firstSheet],
    { header: 1, defval: "", raw: false, blankrows: false },
  );
  const rows = values.map((row) => row.map(cleanOvalCell));
  return extractSpreadsheetRowsWeek(
    rows,
    weekStart,
    sourceName,
    sourceMimeType,
  );
}

export function isSpreadsheetFile(file: File): boolean {
  return (
    SPREADSHEET_MIMES.has(file.type) || /\.(xlsx?|csv|tsv)$/i.test(file.name)
  );
}
