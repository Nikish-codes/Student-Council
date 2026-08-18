import * as XLSX from "xlsx";

import {
  OVAL_MATRIX_SECTIONS,
  matchesOvalMatrixLabel,
} from "@/lib/oval-matrix";
import { OVAL_WEEKDAYS, type OvalWeekDraft } from "@/lib/oval-menu";

function xlsxDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  })
    .format(new Date(`${date}T12:00:00.000Z`))
    .replace(" ", "-");
}

/** Build the same A:I matrix used by the committee's standard workbook. */
export function ovalWeekToRows(week: OvalWeekDraft): string[][] {
  const rows: string[][] = [
    ["WEEKLY MENU", "", ...OVAL_WEEKDAYS.map((day) => day.toUpperCase())],
    ["DATE", "", ...week.days.map((day) => xlsxDate(day.menuDate))],
  ];

  for (const section of OVAL_MATRIX_SECTIONS) {
    if (section.parentHeader) {
      rows.push([section.parentHeader, "", ...Array(7).fill("")]);
    }
    rows.push([section.header, "", ...Array(7).fill("")]);
    for (const category of section.categories) {
      rows.push([
        category.canonical,
        category.display,
        ...week.days.map((day) =>
          day.meals[section.meal]
            .filter((item) =>
              matchesOvalMatrixLabel(item.category, category.display, [
                category.canonical,
                ...(category.aliases ?? []),
              ]),
            )
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
    { wch: 22 },
    { wch: 22 },
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
