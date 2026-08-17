import * as XLSX from "xlsx";

import { OVAL_MEALS, OVAL_WEEKDAYS, type OvalWeekDraft } from "@/lib/oval-menu";

function categoryKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Build a stable eight-column sheet that can be imported without OCR. */
export function ovalWeekToRows(week: OvalWeekDraft): string[][] {
  const rows: string[][] = [
    ["", ...OVAL_WEEKDAYS.map((day) => day.toUpperCase())],
  ];

  for (const meal of OVAL_MEALS) {
    rows.push(Array.from({ length: 8 }, () => meal.label.toUpperCase()));
    const categories: Array<{ key: string; label: string }> = [];
    const seen = new Set<string>();
    for (const day of week.days) {
      for (const item of day.meals[meal.id]) {
        const key = categoryKey(item.category);
        if (key && !seen.has(key)) {
          seen.add(key);
          categories.push({ key, label: item.category });
        }
      }
    }

    for (const category of categories) {
      rows.push([
        category.label,
        ...week.days.map((day) =>
          day.meals[meal.id]
            .filter((item) => categoryKey(item.category) === category.key)
            .map((item) => item.dish)
            .join(" / "),
        ),
      ]);
    }
  }
  return rows;
}

export function buildOvalWeekXlsx(week: OvalWeekDraft): ArrayBuffer {
  const worksheet = XLSX.utils.aoa_to_sheet(ovalWeekToRows(week));
  worksheet["!cols"] = [
    { wch: 24 },
    ...Array.from({ length: 7 }, () => ({ wch: 32 })),
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Oval weekly menu");
  const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as
    | ArrayBuffer
    | Uint8Array;
  if (output instanceof ArrayBuffer) return output;
  const copy = new Uint8Array(output.byteLength);
  copy.set(output);
  return copy.buffer;
}

export function downloadOvalWeekXlsx(week: OvalWeekDraft): void {
  const bytes = buildOvalWeekXlsx(week);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `oval-menu-${week.weekStart}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
