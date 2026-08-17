import type { OvalImportMethod, OvalMealId } from "@/db/schema";
import {
  OVAL_WEEKDAYS,
  createEmptyWeek,
  makeOvalItem,
  ovalWeekDraftSchema,
  type OvalWeekDraft,
} from "@/lib/oval-menu";

export type OvalDetectedCell = {
  text: string;
  confidence: number;
};

export type OvalDetectedRow = OvalDetectedCell[];

export function cleanOvalCell(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeOvalCell(value: unknown): string {
  return cleanOvalCell(value)
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim();
}

export function ovalWeekdayIndex(value: unknown): number {
  const clean = normalizeOvalCell(value);
  return OVAL_WEEKDAYS.findIndex((day) => clean === day.toLowerCase());
}

function blankDish(value: string): boolean {
  return !value || !/[a-z0-9]/i.test(value) || /^[-–—*\s]+$/.test(value);
}

/** Convert a detected table into the same verified draft shape used by XLSX. */
export function extractDetectedRowsWeek(
  rows: OvalDetectedRow[],
  weekStart: string,
  sourceName: string,
  sourceMimeType: string,
  importMethod: Extract<OvalImportMethod, "spreadsheet" | "ocr">,
): OvalWeekDraft {
  const headerIndex = rows.findIndex(
    (row) =>
      row.filter((entry) => ovalWeekdayIndex(entry?.text) >= 0).length >= 3,
  );
  if (headerIndex < 0) {
    throw new Error("Could not find the Monday–Sunday header in this sheet");
  }

  const dayColumns = new Map<number, number>();
  rows[headerIndex].forEach((entry, column) => {
    const day = ovalWeekdayIndex(entry?.text);
    if (day >= 0 && !dayColumns.has(day)) dayColumns.set(day, column);
  });
  if (dayColumns.size !== 7) {
    throw new Error(`Found ${dayColumns.size} weekday columns; expected all 7`);
  }

  const week = createEmptyWeek(weekStart, importMethod);
  week.sourceName = sourceName;
  week.sourceMimeType = sourceMimeType;
  let currentMeal: OvalMealId | null = null;
  let jainMeal: "lunch" | "dinner" | null = null;
  let inJainArea = false;

  for (const row of rows.slice(headerIndex + 1)) {
    const firstCell = row[0] ?? { text: "", confidence: 0 };
    const first = normalizeOvalCell(firstCell.text);
    const exactMealCells = Array.from(dayColumns.values()).filter((column) =>
      ["breakfast", "lunch", "dinner"].includes(
        normalizeOvalCell(row[column]?.text),
      ),
    ).length;
    const rowMentionsJain = row.some((entry) =>
      normalizeOvalCell(entry?.text).includes("jain food"),
    );
    if (rowMentionsJain) inJainArea = true;

    if (inJainArea && first.includes("lunch menu")) {
      jainMeal = "lunch";
      currentMeal = null;
      continue;
    }
    if (inJainArea && first === "dinner" && exactMealCells < 3) {
      jainMeal = "dinner";
      currentMeal = null;
      continue;
    }

    const coreMeal = (["breakfast", "lunch", "dinner"] as const).find(
      (meal) => first === meal && exactMealCells >= 3,
    );
    if (coreMeal) {
      currentMeal = coreMeal;
      jainMeal = null;
      continue;
    }

    // On compact screenshots, OCR can merge the coloured meal-header row with
    // the first category row (for example "DINNER SALAD"). Recover both pieces
    // rather than accidentally filing the entire dinner section under lunch.
    const mergedMeal = (["breakfast", "lunch", "dinner"] as const).find(
      (meal) =>
        first.startsWith(`${meal} `) &&
        Array.from(dayColumns.values()).filter((column) =>
          normalizeOvalCell(row[column]?.text).startsWith(`${meal} `),
        ).length >= 3,
    );
    if (mergedMeal) {
      currentMeal = mergedMeal;
      jainMeal = null;
    }

    const rawCategory = cleanOvalCell(firstCell.text).replace(
      mergedMeal ? new RegExp(`^${mergedMeal}\\s*`, "i") : /$^/,
      "",
    );
    if (!rawCategory) continue;
    const targetMeal = jainMeal ?? currentMeal;
    if (!targetMeal) continue;
    let category = rawCategory;
    if (jainMeal) {
      if (first === "veg" || first === "vegetable")
        category = "Jain · vegetable";
      else if (first === "lentil" || first === "dal")
        category = "Jain · lentil";
      else category = `Jain · ${rawCategory}`;
    }

    for (const [dayIndex, column] of dayColumns) {
      const detected = row[column] ?? { text: "", confidence: 0 };
      const dish = cleanOvalCell(detected.text).replace(
        mergedMeal ? new RegExp(`^${mergedMeal}\\s*`, "i") : /$^/,
        "",
      );
      if (blankDish(dish)) continue;
      const confidence = Math.min(
        firstCell.confidence || detected.confidence,
        detected.confidence,
      );
      week.days[dayIndex].meals[targetMeal].push(
        makeOvalItem(category, dish, {
          confidence,
          needsReview: importMethod === "ocr" && confidence < 0.92,
          sourceText: dish,
        }),
      );
    }
  }

  return ovalWeekDraftSchema.parse(week);
}
