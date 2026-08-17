import "server-only";

import * as XLSX from "xlsx";

import {
  cleanOvalCell,
  extractDetectedRowsWeek,
  type OvalDetectedRow,
} from "@/lib/oval-table-parser";
import type { OvalWeekDraft } from "@/lib/oval-menu";

const SPREADSHEET_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "text/tab-separated-values",
]);

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
    {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    },
  );
  const rows: OvalDetectedRow[] = values.map((row) =>
    row.map((value) => ({ text: cleanOvalCell(value), confidence: 1 })),
  );
  return extractDetectedRowsWeek(
    rows,
    weekStart,
    sourceName,
    sourceMimeType,
    "spreadsheet",
  );
}

export function isSpreadsheetFile(file: File): boolean {
  return (
    SPREADSHEET_MIMES.has(file.type) || /\.(xlsx?|csv|tsv)$/i.test(file.name)
  );
}
