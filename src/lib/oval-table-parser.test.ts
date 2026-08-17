import { describe, expect, it } from "vitest";

import {
  extractDetectedRowsWeek,
  type OvalDetectedRow,
} from "./oval-table-parser";

const cell = (text: string, confidence = 0.98) => ({ text, confidence });
const mealHeader = (label: string): OvalDetectedRow => [
  cell(label),
  ...Array.from({ length: 7 }, () => cell(label)),
];

describe("Oval detected table parser", () => {
  it("reconstructs seven OCR columns and preserves confidence flags", () => {
    const rows: OvalDetectedRow[] = [
      [
        cell(""),
        cell("MONDAY"),
        cell("TUESDAY"),
        cell("WEDNESDAY"),
        cell("THURSDAY"),
        cell("FRIDAY"),
        cell("SATURDAY"),
        cell("SUNDAY"),
      ],
      mealHeader("BREAKFAST"),
      [
        cell("EGGS"),
        cell("Boiled eggs"),
        ...Array.from({ length: 6 }, () => cell("Omelette")),
      ],
      mealHeader("LUNCH"),
      [
        cell("VEG1 (Dry)"),
        cell("Subzi Kolhapuri", 0.8),
        ...Array.from({ length: 6 }, () => cell("Bhindi fry")),
      ],
      mealHeader("DINNER"),
      [
        cell("VEG2"),
        cell("Paneer curry"),
        ...Array.from({ length: 6 }, () => cell("Dal curry")),
      ],
    ];

    const week = extractDetectedRowsWeek(
      rows,
      "2026-08-17",
      "menu.png",
      "image/png",
      "ocr",
    );

    expect(week.days).toHaveLength(7);
    expect(week.days[0].meals.breakfast[0].dish).toBe("Boiled eggs");
    expect(week.days[0].meals.lunch[0]).toMatchObject({
      category: "VEG1 (Dry)",
      dish: "Subzi Kolhapuri",
      needsReview: true,
      confidence: 0.8,
    });
    expect(week.days[6].meals.dinner[0].dish).toBe("Dal curry");
  });

  it("rejects a table when the OCR misses a weekday column", () => {
    const rows: OvalDetectedRow[] = [
      [cell(""), cell("MONDAY"), cell("TUESDAY"), cell("WEDNESDAY")],
    ];
    expect(() =>
      extractDetectedRowsWeek(
        rows,
        "2026-08-17",
        "menu.png",
        "image/png",
        "ocr",
      ),
    ).toThrow("expected all 7");
  });

  it("recovers a meal header merged into its first category row", () => {
    const rows: OvalDetectedRow[] = [
      [
        cell(""),
        cell("MONDAY"),
        cell("TUESDAY"),
        cell("WEDNESDAY"),
        cell("THURSDAY"),
        cell("FRIDAY"),
        cell("SATURDAY"),
        cell("SUNDAY"),
      ],
      mealHeader("LUNCH"),
      [cell("SALAD"), ...Array.from({ length: 7 }, () => cell("Green salad"))],
      [
        cell("DINNER SALAD"),
        ...Array.from({ length: 7 }, () => cell("DINNER Tossed salad")),
      ],
      [cell("VEG1"), ...Array.from({ length: 7 }, () => cell("Paneer curry"))],
    ];

    const week = extractDetectedRowsWeek(
      rows,
      "2026-08-17",
      "menu.png",
      "image/png",
      "ocr",
    );

    expect(week.days[0].meals.lunch).toHaveLength(1);
    expect(week.days[0].meals.dinner).toMatchObject([
      { category: "SALAD", dish: "Tossed salad" },
      { category: "VEG1", dish: "Paneer curry" },
    ]);
  });

  it("drops OCR hallucinations from symbol-only placeholder cells", () => {
    const rows: OvalDetectedRow[] = [
      [
        cell(""),
        cell("MONDAY"),
        cell("TUESDAY"),
        cell("WEDNESDAY"),
        cell("THURSDAY"),
        cell("FRIDAY"),
        cell("SATURDAY"),
        cell("SUNDAY"),
      ],
      mealHeader("LUNCH"),
      [
        cell("DESSERT"),
        cell("大★★大"),
        ...Array.from({ length: 6 }, () => cell("-")),
      ],
    ];

    const week = extractDetectedRowsWeek(
      rows,
      "2026-08-17",
      "menu.png",
      "image/png",
      "ocr",
    );
    expect(week.days.every((day) => day.meals.lunch.length === 0)).toBe(true);
  });
});
