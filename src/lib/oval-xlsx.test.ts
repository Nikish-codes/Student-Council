import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { createEmptyWeek, makeOvalItem } from "@/lib/oval-menu";
import {
  extractDetectedRowsWeek,
  type OvalDetectedRow,
} from "@/lib/oval-table-parser";
import { buildOvalWeekXlsx } from "@/lib/oval-xlsx";

describe("Oval XLSX export", () => {
  it("round-trips a seven-day menu through a real XLSX workbook", () => {
    const original = createEmptyWeek("2026-08-17", "ocr");
    original.days.forEach((day, index) => {
      day.meals.breakfast.push(
        makeOvalItem("Eggs", `Boiled eggs ${index + 1}`),
      );
      day.meals.lunch.push(makeOvalItem("Veg 1", `Lunch curry ${index + 1}`));
      day.meals.dinner.push(makeOvalItem("Rice", `Dinner rice ${index + 1}`));
    });

    const workbook = XLSX.read(buildOvalWeekXlsx(original), { type: "array" });
    const values = XLSX.utils.sheet_to_json<unknown[]>(
      workbook.Sheets[workbook.SheetNames[0]],
      { header: 1, defval: "", raw: false },
    );
    const rows: OvalDetectedRow[] = values.map((row) =>
      row.map((value) => ({ text: String(value), confidence: 1 })),
    );
    const imported = extractDetectedRowsWeek(
      rows,
      original.weekStart,
      "round-trip.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "spreadsheet",
    );

    expect(imported.days.map((day) => day.meals.breakfast[0].dish)).toEqual(
      original.days.map((day) => day.meals.breakfast[0].dish),
    );
    expect(imported.days.map((day) => day.meals.lunch[0].dish)).toEqual(
      original.days.map((day) => day.meals.lunch[0].dish),
    );
    expect(imported.days.map((day) => day.meals.dinner[0].dish)).toEqual(
      original.days.map((day) => day.meals.dinner[0].dish),
    );
  });
});
