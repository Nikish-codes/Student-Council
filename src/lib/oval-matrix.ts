import type { OvalMealId } from "@/db/schema";

export type OvalMatrixCategory = {
  canonical: string;
  display: string;
  aliases?: readonly string[];
};

export type OvalMatrixSection = {
  meal: OvalMealId;
  header: string;
  headerAliases?: readonly string[];
  parentHeader?: string;
  categories: readonly OvalMatrixCategory[];
};

/**
 * The committee's fixed workbook contract. Weekday values may change; this
 * row sequence may not. Keeping it explicit makes spreadsheet imports
 * deterministic and lets exported workbooks round-trip without OCR.
 */
export const OVAL_MATRIX_SECTIONS: readonly OvalMatrixSection[] = [
  {
    meal: "breakfast",
    header: "BREAKFAST",
    categories: [
      { canonical: "EGGS", display: "Eggs" },
      { canonical: "BREAD", display: "Bread" },
      { canonical: "CEREALS & SPROUTS", display: "Cereals & Sprouts" },
      {
        canonical: "B / ITEM",
        display: "B / Item",
        aliases: ["B/ITEM", "B ITEM"],
      },
      { canonical: "ACCOMPANIMENT", display: "Accompaniment" },
      { canonical: "DETOX WATER", display: "Detox Water" },
      { canonical: "HOT BEVERAGE", display: "Hot Beverage" },
    ],
  },
  {
    meal: "lunch",
    header: "LUNCH",
    categories: [
      { canonical: "COLD BEVERAGE", display: "Cold Beverage" },
      { canonical: "SALAD", display: "Salad" },
      { canonical: "FRY ITEM", display: "Fry Item" },
      {
        canonical: "VEG1 (DRY)",
        display: "Veg 1 (Dry)",
        aliases: ["VEG 1 (DRY)", "VEG1 DRY", "VEG 1 DRY"],
      },
      {
        canonical: "VEG2 (GRAVY)",
        display: "Veg 2 (Gravy)",
        aliases: ["VEG 2 (GRAVY)", "VEG2 GRAVY", "VEG 2 GRAVY"],
      },
      { canonical: "LENTIL", display: "Lentil" },
      { canonical: "RICE 1", display: "Rice 1", aliases: ["RICE1"] },
      { canonical: "RICE 2", display: "Rice 2", aliases: ["RICE2"] },
      { canonical: "ACCOMPANIMENT", display: "Accompaniment" },
      { canonical: "DESSERT", display: "Dessert" },
      { canonical: "INDIAN BREAD", display: "Indian Bread" },
    ],
  },
  {
    meal: "dinner",
    header: "DINNER",
    categories: [
      { canonical: "SALAD", display: "Salad" },
      {
        canonical: "STARTER / SOUP",
        display: "Starter / Soup",
        aliases: ["STARTER/SOUP", "STARTER SOUP"],
      },
      { canonical: "VEG1", display: "Veg 1", aliases: ["VEG 1"] },
      { canonical: "VEG2", display: "Veg 2", aliases: ["VEG 2"] },
      { canonical: "LENTIL", display: "Lentil" },
      { canonical: "ACCOMPANIMENT", display: "Accompaniment" },
      { canonical: "RICE 1", display: "Rice 1", aliases: ["RICE1"] },
      { canonical: "RICE 2", display: "Rice 2", aliases: ["RICE2"] },
      { canonical: "INDIAN BREAD", display: "Indian Bread" },
      {
        canonical: "HOT BEV / FRUIT",
        display: "Hot Bev / Fruit",
        aliases: ["HOT BEV/FRUIT", "HOT BEVERAGE / FRUIT"],
      },
    ],
  },
  {
    meal: "jain_lunch",
    parentHeader: "JAIN FOOD",
    header: "LUNCH MENU",
    headerAliases: ["JAIN LUNCH", "LUNCH"],
    categories: [
      { canonical: "VEG", display: "Veg", aliases: ["VEGETABLE"] },
      { canonical: "LENTIL", display: "Lentil", aliases: ["DAL"] },
    ],
  },
  {
    meal: "jain_dinner",
    header: "DINNER",
    headerAliases: ["JAIN DINNER", "DINNER MENU"],
    categories: [
      { canonical: "VEG", display: "Veg", aliases: ["VEGETABLE"] },
      { canonical: "LENTIL", display: "Lentil", aliases: ["DAL"] },
    ],
  },
] as const;

export function normalizeOvalMatrixLabel(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export function matchesOvalMatrixLabel(
  value: unknown,
  canonical: string,
  aliases: readonly string[] = [],
): boolean {
  const normalized = normalizeOvalMatrixLabel(value);
  return [canonical, ...aliases].some(
    (candidate) => normalizeOvalMatrixLabel(candidate) === normalized,
  );
}
