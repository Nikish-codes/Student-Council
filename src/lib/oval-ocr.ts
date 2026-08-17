import "server-only";

import * as XLSX from "xlsx";
import { z } from "zod";

import type { OvalMealId, OvalMeals } from "@/db/schema";
import {
  OVAL_WEEKDAYS,
  addIsoDays,
  createEmptyWeek,
  inferOvalDiets,
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

const visionItemSchema = z.object({
  category: z.string(),
  dish: z.string(),
  diets: z.array(z.enum(["veg", "egg", "nonveg"])),
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
  sourceText: z.string(),
});

const visionWeekSchema = z.object({
  days: z
    .array(
      z.object({
        weekday: z.enum(OVAL_WEEKDAYS),
        breakfast: z.array(visionItemSchema),
        lunch: z.array(visionItemSchema),
        dinner: z.array(visionItemSchema),
      }),
    )
    .length(7)
    .refine(
      (days) => new Set(days.map((day) => day.weekday)).size === 7,
      "OCR output must contain each weekday exactly once",
    ),
});

const VISION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["days"],
  properties: {
    days: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["weekday", "breakfast", "lunch", "dinner"],
        properties: {
          weekday: { type: "string", enum: [...OVAL_WEEKDAYS] },
          breakfast: { type: "array", items: { $ref: "#/$defs/item" } },
          lunch: { type: "array", items: { $ref: "#/$defs/item" } },
          dinner: { type: "array", items: { $ref: "#/$defs/item" } },
        },
      },
    },
  },
  $defs: {
    item: {
      type: "object",
      additionalProperties: false,
      required: [
        "category",
        "dish",
        "diets",
        "confidence",
        "needsReview",
        "sourceText",
      ],
      properties: {
        category: { type: "string" },
        dish: { type: "string" },
        diets: {
          type: "array",
          items: { type: "string", enum: ["veg", "egg", "nonveg"] },
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        needsReview: { type: "boolean" },
        sourceText: { type: "string" },
      },
    },
  },
} as const;

function cell(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalized(value: unknown): string {
  return cell(value).toLowerCase().replace(/[^a-z]+/g, " ").trim();
}

function isBlankDish(value: string): boolean {
  return !value || /^[-–—*\s]+$/.test(value);
}

function weekdayIndex(value: unknown): number {
  const clean = normalized(value);
  return OVAL_WEEKDAYS.findIndex((day) => clean === day.toLowerCase());
}

/**
 * Direct table extraction for XLS/XLSX/CSV. This is intentionally deterministic:
 * when cells already exist, OCR would only introduce spelling errors.
 */
export function extractSpreadsheetWeek(
  bytes: Uint8Array,
  weekStart: string,
  sourceName: string,
  sourceMimeType: string,
): OvalWeekDraft {
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error("The spreadsheet has no sheets");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  const headerIndex = rows.findIndex(
    (row) => row.filter((value) => weekdayIndex(value) >= 0).length >= 3,
  );
  if (headerIndex < 0) {
    throw new Error("Could not find weekday columns in the spreadsheet");
  }

  const dayColumns = new Map<number, number>();
  rows[headerIndex].forEach((value, column) => {
    const day = weekdayIndex(value);
    if (day >= 0 && !dayColumns.has(day)) dayColumns.set(day, column);
  });
  if (dayColumns.size !== 7) {
    throw new Error(`Found ${dayColumns.size} weekday columns; expected all 7`);
  }

  const week = createEmptyWeek(weekStart, "spreadsheet");
  week.sourceName = sourceName;
  week.sourceMimeType = sourceMimeType;
  let currentMeal: OvalMealId | null = null;
  let jainMeal: "lunch" | "dinner" | null = null;
  let inJainArea = false;

  for (const row of rows.slice(headerIndex + 1)) {
    const first = normalized(row[0]);
    const exactMealCells = Array.from(dayColumns.values()).filter((column) =>
      ["breakfast", "lunch", "dinner"].includes(normalized(row[column])),
    ).length;
    const rowMentionsJain = row.some((value) => normalized(value).includes("jain food"));
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

    const rawCategory = cell(row[0]);
    if (!rawCategory) continue;
    let category = rawCategory;
    const targetMeal = jainMeal ?? currentMeal;
    if (!targetMeal) continue;
    if (jainMeal) {
      if (first === "veg" || first === "vegetable") category = "Jain · vegetable";
      else if (first === "lentil" || first === "dal") category = "Jain · lentil";
      else category = `Jain · ${rawCategory}`;
    }

    for (const [dayIndex, column] of dayColumns) {
      const dish = cell(row[column]);
      if (isBlankDish(dish)) continue;
      week.days[dayIndex].meals[targetMeal].push(
        makeOvalItem(category, dish, {
          confidence: 1,
          needsReview: false,
          sourceText: dish,
        }),
      );
    }
  }

  return ovalWeekDraftSchema.parse(week);
}

function outputText(response: unknown): string {
  const body = response as {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  for (const item of body.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("The OCR service returned no structured output");
}

function normalizeVisionResult(
  value: unknown,
  weekStart: string,
  sourceName: string,
  sourceMimeType: string,
): OvalWeekDraft {
  const parsed = visionWeekSchema.parse(value);
  const byWeekday = new Map(parsed.days.map((day) => [day.weekday, day]));
  const week = createEmptyWeek(weekStart, "vision");
  week.sourceName = sourceName;
  week.sourceMimeType = sourceMimeType;

  week.days = OVAL_WEEKDAYS.map((weekday, dayIndex) => {
    const extracted = byWeekday.get(weekday);
    const meals = { breakfast: [], lunch: [], dinner: [] } as OvalMeals;
    if (!extracted) {
      throw new Error(`OCR output is missing ${weekday}`);
    }
    for (const meal of ["breakfast", "lunch", "dinner"] as const) {
      meals[meal] = extracted[meal]
        .filter((item) => !isBlankDish(cell(item.dish)))
        .map((item) => {
          const made = makeOvalItem(item.category || "Uncategorised", item.dish, {
            confidence: item.confidence,
            needsReview: item.needsReview || item.confidence < 0.92,
            sourceText: item.sourceText,
          });
          made.diets = item.diets.length ? item.diets : inferOvalDiets(item.dish);
          return made;
        });
    }
    return { menuDate: addIsoDays(weekStart, dayIndex), meals };
  });

  return ovalWeekDraftSchema.parse(week);
}

function sourceContent(file: File, encoded: string) {
  const dataUrl = `data:${file.type || "application/octet-stream"};base64,${encoded}`;
  if (file.type.startsWith("image/")) {
    return { type: "input_image", image_url: dataUrl, detail: "high" } as const;
  }
  return {
    type: "input_file",
    filename: file.name || "oval-menu.pdf",
    file_data: dataUrl,
    detail: "high",
  } as const;
}

async function callVisionExtraction(
  file: File,
  encoded: string,
  weekStart: string,
  prior?: OvalWeekDraft,
): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Image/PDF extraction is not configured. Add OPENAI_API_KEY, or upload XLSX/CSV.",
    );
  }
  const model = process.env.OPENAI_OVAL_OCR_MODEL || "gpt-5.6-terra";
  const verification = prior
    ? `This is verification pass 2. Compare every cell against the source and correct this draft. Do not preserve a draft value when the source disagrees:\n${JSON.stringify(prior)}`
    : "This is extraction pass 1. Read every visible cell independently.";
  const prompt = `Extract the complete Oval mess weekly menu starting ${weekStart}.

The table has exactly Monday through Sunday and exactly three public meals: Breakfast, Lunch, Dinner. Do not create Evening Snacks. Preserve row categories such as eggs, bread, cereals & sprouts, breakfast item, accompaniment, detox water, hot beverage, cold beverage, salad, fry item, vegetable preparations, lentil, rice, dessert, Indian bread, starter/soup, hot beverage/fruit, and separate Jain lunch/dinner categories. Asterisks, decorative blanks, and empty cells are not dishes.

Transcribe spelling faithfully but normalize obvious whitespace. Identify vegetarian, egg, and non-vegetarian markers; a mixed cell can have more than one marker. Confidence is per cell from 0 to 1. Set needsReview=true for ambiguity, merged-cell uncertainty, unreadable text, questionable category alignment, or confidence below 0.92. sourceText is the literal text you believe appears in the cell.

${verification}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      reasoning: { effort: "medium" },
      input: [
        {
          role: "user",
          content: [
            sourceContent(file, encoded),
            { type: "input_text", text: prompt },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "oval_week_menu",
          strict: true,
          schema: VISION_JSON_SCHEMA,
        },
      },
      max_output_tokens: 30_000,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const body = (await response.json()) as { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(body.error?.message || `OCR request failed (${response.status})`);
  }
  return JSON.parse(outputText(body));
}

export async function extractVisionWeek(
  file: File,
  bytes: Uint8Array,
  weekStart: string,
): Promise<OvalWeekDraft> {
  const encoded = Buffer.from(bytes).toString("base64");
  const firstRaw = await callVisionExtraction(file, encoded, weekStart);
  const first = normalizeVisionResult(
    firstRaw,
    weekStart,
    file.name,
    file.type,
  );
  if (process.env.OPENAI_OVAL_OCR_VERIFY === "off") return first;

  const verifiedRaw = await callVisionExtraction(file, encoded, weekStart, first);
  return normalizeVisionResult(
    verifiedRaw,
    weekStart,
    file.name,
    file.type,
  );
}

export function isSpreadsheetFile(file: File): boolean {
  return (
    SPREADSHEET_MIMES.has(file.type) ||
    /\.(xlsx?|csv|tsv)$/i.test(file.name)
  );
}
