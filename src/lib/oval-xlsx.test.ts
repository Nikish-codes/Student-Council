import { describe, expect, it } from "vitest";

import { createEmptyWeek, makeOvalItem } from "@/lib/oval-menu";
import { extractSpreadsheetWeek } from "@/lib/oval-spreadsheet";
import { buildOvalWeekXlsx } from "@/lib/oval-xlsx";

describe("Oval XLSX export", () => {
  it("round-trips a seven-day menu through a real XLSX workbook", () => {
    const original = createEmptyWeek("2026-08-17", "spreadsheet");
    original.days.forEach((day, index) => {
      day.meals.breakfast.push(
        makeOvalItem("Eggs", `Boiled eggs ${index + 1}`),
      );
      day.meals.lunch.push(
        makeOvalItem("Veg 1 (Dry)", `Lunch curry ${index + 1}`),
      );
      day.meals.dinner.push(makeOvalItem("Rice 1", `Dinner rice ${index + 1}`));
      day.meals.jain_lunch.push(makeOvalItem("Veg", `Jain lunch ${index + 1}`));
      day.meals.jain_dinner.push(
        makeOvalItem("Lentil", `Jain dinner ${index + 1}`),
      );
    });

    const imported = extractSpreadsheetWeek(
      new Uint8Array(buildOvalWeekXlsx(original)),
      original.weekStart,
      "round-trip.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
    expect(imported.days.map((day) => day.meals.jain_lunch[0].dish)).toEqual(
      original.days.map((day) => day.meals.jain_lunch[0].dish),
    );
    expect(imported.days.map((day) => day.meals.jain_dinner[0].dish)).toEqual(
      original.days.map((day) => day.meals.jain_dinner[0].dish),
    );
  });
});
