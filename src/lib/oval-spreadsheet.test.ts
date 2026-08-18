import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { OVAL_MEALS, createEmptyWeek } from "./oval-menu";
import {
  extractSpreadsheetRowsWeek,
  extractSpreadsheetWeek,
} from "./oval-spreadsheet";
import { ovalWeekToRows } from "./oval-xlsx";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

describe("Oval spreadsheet extraction", () => {
  it("maps the real committee workbook into exact weekday and meal sections", () => {
    const bytes = readFileSync(
      new URL("../test/fixtures/weekly-menu-matrix.xlsx", import.meta.url),
    );
    const week = extractSpreadsheetWeek(
      bytes,
      "2026-08-17",
      "weekly_menu_monday_to_sunday.xlsx",
      XLSX_MIME,
    );

    expect(week.days.map((day) => day.menuDate)).toEqual([
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ]);
    expect(week.days[0].meals.breakfast.map((item) => item.dish)).toEqual([
      "Boiled eggs",
      "Bread with Butter / Jam",
      "Corn Flakes,Sprouts",
      "Idly / Sambar / Coconut Chutney",
      "Tomato Bath",
      "Detox Orange & Lemon",
      "Tea/Coffee/Milk",
    ]);
    expect(week.days[3].meals.lunch).toMatchObject([
      { category: "Cold Beverage", dish: "Masala Butter Milk" },
      { category: "Fry Item", dish: "JAGGERY CHIPS & BANANA CHIPS" },
      { category: "Veg1 (Dry)", dish: "TOMATO SAMBHAR" },
      { category: "Veg2 (Gravy)", dish: "BEETROOT PACHEDI" },
      { category: "Lentil", dish: "MIX VEG DAL" },
      { category: "Rice 1", dish: "KALAN" },
      { category: "Rice 2", dish: "MATTA RICE / STEAMED RICE" },
      {
        category: "Accompaniment",
        dish: "RICE PAPAD / MANGO PICKLE / CURD CHILLY",
      },
      { category: "Dessert", dish: "PARIPPU PAYASAM & ELAICHI BANANA" },
    ]);
    expect(week.days[4].meals.dinner).toMatchObject([
      { category: "Salad", dish: "Onion salad / Lemon" },
      { category: "Veg1", dish: "Peshawari Kadhai Paneer Curry" },
      { category: "Veg2", dish: "Peshawari Chicken Curry" },
      { category: "Lentil", dish: "Dhaba Style Dal Fry" },
      { category: "Accompaniment", dish: "Pickle / Curd" },
      { category: "Rice 1", dish: "Bhagara Pulao" },
      { category: "Rice 2", dish: "Chapati" },
      { category: "Indian Bread", dish: "Chapati" },
      { category: "Hot Bev / Fruit", dish: "Hot milk / Banana" },
    ]);
    expect(week.days[6].meals.jain_lunch).toMatchObject([
      { category: "Veg", dish: "Capsicum Paneer" },
      { category: "Lentil", dish: "Mix dal" },
    ]);
    expect(week.days[6].meals.jain_dinner).toMatchObject([
      { category: "Veg", dish: "Masala Ghugni" },
      { category: "Lentil", dish: "Yellow Moong Dal Tadka" },
    ]);
    expect(
      week.days.map((day) =>
        Object.fromEntries(
          OVAL_MEALS.map((meal) => [meal.id, day.meals[meal.id].length]),
        ),
      ),
    ).toEqual([
      { breakfast: 7, lunch: 10, dinner: 8, jain_lunch: 2, jain_dinner: 2 },
      { breakfast: 7, lunch: 9, dinner: 8, jain_lunch: 2, jain_dinner: 2 },
      { breakfast: 7, lunch: 9, dinner: 8, jain_lunch: 2, jain_dinner: 2 },
      { breakfast: 7, lunch: 9, dinner: 8, jain_lunch: 2, jain_dinner: 2 },
      { breakfast: 7, lunch: 10, dinner: 9, jain_lunch: 2, jain_dinner: 2 },
      { breakfast: 7, lunch: 9, dinner: 8, jain_lunch: 2, jain_dinner: 2 },
      { breakfast: 7, lunch: 10, dinner: 9, jain_lunch: 2, jain_dinner: 2 },
    ]);
    const exactCellMap = week.days.map((day) =>
      Object.fromEntries(
        OVAL_MEALS.map((meal) => [
          meal.id,
          day.meals[meal.id].map(({ category, dish }) => ({ category, dish })),
        ]),
      ),
    );
    expect(
      createHash("sha256").update(JSON.stringify(exactCellMap)).digest("hex"),
    ).toBe("d10dd28932d2dfaf7056b95dadb40d0705b7b89f13445486b80173d7b3914f33");
    const importedItems = week.days.flatMap((day) =>
      OVAL_MEALS.flatMap((meal) => day.meals[meal.id]),
    );
    expect(importedItems).toHaveLength(201);
    expect(
      importedItems.every(
        (item) => item.confidence === 1 && item.needsReview === false,
      ),
    ).toBe(true);
  });

  it("rejects a workbook whose fixed row structure was changed", () => {
    const rows = ovalWeekToRows(createEmptyWeek("2026-08-17"));
    rows[4][0] = "BREAD MOVED";
    rows[4][1] = "Bread moved";

    expect(() =>
      extractSpreadsheetRowsWeek(rows, "2026-08-17", "changed.xlsx", XLSX_MIME),
    ).toThrow("Expected “Bread” at spreadsheet row 5");
  });

  it("rejects a valid matrix uploaded into the wrong selected week", () => {
    const bytes = readFileSync(
      new URL("../test/fixtures/weekly-menu-matrix.xlsx", import.meta.url),
    );

    expect(() =>
      extractSpreadsheetWeek(bytes, "2026-08-24", "wrong-week.xlsx", XLSX_MIME),
    ).toThrow("selected week expects 24 Aug");
  });
});
