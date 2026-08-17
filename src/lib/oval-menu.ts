import { z } from "zod";

import type {
  OvalDiet,
  OvalImportMethod,
  OvalMealId,
  OvalMeals,
  OvalMenuItem,
} from "@/db/schema";

export const OVAL_TIMEZONE = "Asia/Kolkata";
export const OVAL_RELEASE_HOUR = 4;

export const OVAL_MEALS: ReadonlyArray<{
  id: OvalMealId;
  label: string;
  time: string;
  startMinute: number;
  endMinute: number;
}> = [
  {
    id: "breakfast",
    label: "Breakfast",
    time: "7:00–9:45 AM",
    startMinute: 7 * 60,
    endMinute: 9 * 60 + 45,
  },
  {
    id: "lunch",
    label: "Lunch",
    time: "12:00–2:45 PM",
    startMinute: 12 * 60,
    endMinute: 14 * 60 + 45,
  },
  {
    id: "dinner",
    label: "Dinner",
    time: "7:00–9:45 PM",
    startMinute: 19 * 60,
    endMinute: 21 * 60 + 45,
  },
];

export const OVAL_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const dietSchema = z.enum(["veg", "egg", "nonveg"]);
const itemSchema = z.object({
  id: z.string().min(1).max(80),
  category: z.string().trim().min(1).max(100),
  dish: z.string().trim().min(1).max(300),
  diets: z.array(dietSchema).min(1).max(3),
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
  sourceText: z.string().max(500).optional(),
});

export const ovalMealsSchema = z.object({
  breakfast: z.array(itemSchema).max(40),
  lunch: z.array(itemSchema).max(40),
  dinner: z.array(itemSchema).max(40),
});

export const ovalWeekDraftSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceName: z.string().trim().max(255).optional(),
  sourceMimeType: z.string().trim().max(120).optional(),
  importMethod: z.enum(["manual", "spreadsheet", "vision"]),
  days: z
    .array(
      z.object({
        menuDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        meals: ovalMealsSchema,
      }),
    )
    .length(7),
});

export type OvalWeekDraft = z.infer<typeof ovalWeekDraftSchema>;

function dateParts(date: Date, timeZone = OVAL_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

function isoFromParts(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/** The campus service day changes at 04:00 Asia/Kolkata, not at midnight. */
export function getOvalServiceDate(now = new Date()): string {
  const shifted = new Date(now.getTime() - OVAL_RELEASE_HOUR * 60 * 60 * 1000);
  return isoFromParts(dateParts(shifted));
}

export function getKolkataMinutes(now = new Date()): number {
  const parts = dateParts(now);
  return parts.hour * 60 + parts.minute;
}

export type OvalMealPhase = "completed" | "serving" | "upcoming" | "later";

export function getOvalMealPhases(now = new Date()): Record<OvalMealId, OvalMealPhase> {
  const minute = getKolkataMinutes(now);
  if (minute < OVAL_RELEASE_HOUR * 60) {
    return { breakfast: "completed", lunch: "completed", dinner: "completed" };
  }
  let nextFound = false;
  return Object.fromEntries(
    OVAL_MEALS.map((meal) => {
      let phase: OvalMealPhase;
      if (minute >= meal.startMinute && minute < meal.endMinute) {
        phase = "serving";
        nextFound = true;
      } else if (minute < meal.startMinute && !nextFound) {
        phase = "upcoming";
        nextFound = true;
      } else if (minute >= meal.endMinute) {
        phase = "completed";
      } else {
        phase = "later";
      }
      return [meal.id, phase];
    }),
  ) as Record<OvalMealId, OvalMealPhase>;
}

export function addIsoDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid ISO date");
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function getWeekStart(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid ISO date");
  const day = parsed.getUTCDay();
  return addIsoDays(date, -(day === 0 ? 6 : day - 1));
}

export function formatOvalDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    ...(options ?? { weekday: "long", day: "numeric", month: "long" }),
  }).format(new Date(`${date}T12:00:00.000Z`));
}

export function createEmptyMeals(): OvalMeals {
  return { breakfast: [], lunch: [], dinner: [] };
}

export function createEmptyWeek(
  weekStart: string,
  importMethod: OvalImportMethod = "manual",
): OvalWeekDraft {
  return {
    weekStart,
    importMethod,
    days: Array.from({ length: 7 }, (_, index) => ({
      menuDate: addIsoDays(weekStart, index),
      meals: createEmptyMeals(),
    })),
  };
}

export function inferOvalDiets(dish: string): OvalDiet[] {
  const normalized = dish.toLowerCase();
  const diets: OvalDiet[] = [];
  if (/\b(chicken|mutton|fish|prawn|meat|lamb)\b/.test(normalized)) {
    diets.push("nonveg");
  }
  if (/\b(egg|eggs|anda|omelette|bhurji)\b/.test(normalized)) {
    diets.push("egg");
  }
  if (
    diets.length === 0 ||
    /\b(veg|vegetable|paneer|tofu|soya|dal|lentil|salad)\b/.test(normalized)
  ) {
    diets.unshift("veg");
  }
  return [...new Set(diets)];
}

export function makeOvalItem(
  category: string,
  dish: string,
  options?: Partial<Pick<OvalMenuItem, "confidence" | "needsReview" | "sourceText">>,
): OvalMenuItem {
  const cleanCategory = category.trim();
  const cleanDish = dish.trim();
  const confidence = options?.confidence ?? 1;
  return {
    id: crypto.randomUUID(),
    category: cleanCategory,
    dish: cleanDish,
    diets: inferOvalDiets(cleanDish),
    confidence,
    needsReview:
      options?.needsReview ??
      (confidence < 0.92 ||
        !cleanCategory ||
        !cleanDish ||
        /^\*+$/.test(cleanDish)),
    sourceText: options?.sourceText,
  };
}

export function countOvalReviewFlags(meals: OvalMeals): number {
  return OVAL_MEALS.reduce(
    (total, meal) =>
      total + meals[meal.id].filter((item) => item.needsReview).length,
    0,
  );
}

export function validateApprovableMeals(meals: OvalMeals): string[] {
  const errors: string[] = [];
  for (const meal of OVAL_MEALS) {
    if (meals[meal.id].length === 0) errors.push(`${meal.label} has no items`);
  }
  const flags = countOvalReviewFlags(meals);
  if (flags > 0) errors.push(`${flags} extracted item${flags === 1 ? "" : "s"} still need review`);
  return errors;
}
