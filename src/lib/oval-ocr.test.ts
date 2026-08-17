import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { extractSpreadsheetWeek } from "./oval-ocr";

describe("Oval spreadsheet extraction", () => {
  it("maps seven weekday columns into the three canonical meals", () => {
    const days = [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ];
    const table = [
      ["", ...days],
      ["BREAKFAST", ...days.map(() => "BREAKFAST")],
      ["EGGS", ...days.map(() => "Boiled eggs")],
      ["LUNCH", ...days.map(() => "LUNCH")],
      ["VEG1 (Dry)", ...days.map(() => "Subzi Kolhapuri")],
      ["DINNER", ...days.map(() => "DINNER")],
      ["VEG2", ...days.map(() => "Paneer curry")],
      ["Lunch Menu", "Jain FOOD Menu", "", "", "", "", "", ""],
      ["VEG", ...days.map(() => "Parwal ki bhaji")],
      ["Dinner", "", "", "", "", "", "", ""],
      ["LENTIL", ...days.map(() => "Masoor dal tadka")],
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(table), "Menu");
    const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const week = extractSpreadsheetWeek(
      bytes,
      "2026-08-17",
      "oval.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    expect(week.days).toHaveLength(7);
    expect(week.days[0].meals.breakfast[0].dish).toBe("Boiled eggs");
    expect(week.days[0].meals.lunch.map((item) => item.category)).toContain(
      "Jain · vegetable",
    );
    expect(week.days[6].meals.dinner.map((item) => item.category)).toContain(
      "Jain · lentil",
    );
  });
});
