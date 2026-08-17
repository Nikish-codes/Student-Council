import type { OcrResultItem } from "@paddleocr/paddleocr-js";

import {
  extractDetectedRowsWeek,
  normalizeOvalCell,
  type OvalDetectedCell,
  type OvalDetectedRow,
} from "@/lib/oval-table-parser";
import { OVAL_WEEKDAYS, type OvalWeekDraft } from "@/lib/oval-menu";

type PositionedItem = OcrResultItem & {
  cx: number;
  cy: number;
  height: number;
};

type Progress = (message: string) => void;

const WASM_CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/";

function itemGeometry(item: OcrResultItem): PositionedItem {
  const xs = item.poly.map(([x]) => x);
  const ys = item.poly.map(([, y]) => y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    ...item,
    cx: (left + right) / 2,
    cy: (top + bottom) / 2,
    height: bottom - top,
  };
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function clusterRuns(values: number[], minimumRatio: number, span: number) {
  const positions: Array<{ position: number; score: number }> = [];
  let start = -1;
  for (let index = 0; index <= values.length; index += 1) {
    const qualifies =
      index < values.length && values[index] / span >= minimumRatio;
    if (qualifies && start < 0) start = index;
    if (!qualifies && start >= 0) {
      const end = index - 1;
      let best = start;
      for (let cursor = start + 1; cursor <= end; cursor += 1) {
        if (values[cursor] > values[best]) best = cursor;
      }
      positions.push({ position: best, score: values[best] / span });
      start = -1;
    }
  }
  return positions;
}

function detectGrid(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { vertical: [], horizontal: [] };
  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  const rows = new Uint32Array(height);
  const columns = new Uint32Array(width);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const luminance =
        pixels[offset] * 0.2126 +
        pixels[offset + 1] * 0.7152 +
        pixels[offset + 2] * 0.0722;
      if (pixels[offset + 3] > 100 && luminance < 165) {
        rows[y] += 1;
        columns[x] += 1;
      }
    }
  }

  let vertical = clusterRuns([...columns], 0.55, height);
  if (vertical.length > 9) {
    vertical = vertical
      .sort((a, b) => b.score - a.score)
      .slice(0, 9)
      .sort((a, b) => a.position - b.position);
  }
  const horizontal = clusterRuns([...rows], 0.55, width);
  return {
    vertical:
      vertical.length === 9 ? vertical.map((line) => line.position) : [],
    horizontal:
      horizontal.length >= 8 ? horizontal.map((line) => line.position) : [],
  };
}

function cellFromItems(items: PositionedItem[]): OvalDetectedCell {
  if (!items.length) return { text: "", confidence: 0 };
  const ordered = [...items].sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  return {
    text: ordered
      .map((item) => item.text.trim())
      .filter(Boolean)
      .join(" "),
    confidence: Math.min(...ordered.map((item) => item.score)),
  };
}

function rowsFromGrid(
  items: PositionedItem[],
  vertical: number[],
  horizontal: number[],
): OvalDetectedRow[] {
  const buckets = Array.from({ length: horizontal.length - 1 }, () =>
    Array.from({ length: 8 }, () => [] as PositionedItem[]),
  );
  for (const item of items) {
    const row = horizontal.findIndex(
      (line, index) =>
        index < horizontal.length - 1 &&
        item.cy > line &&
        item.cy < horizontal[index + 1],
    );
    const column = vertical.findIndex(
      (line, index) =>
        index < vertical.length - 1 &&
        item.cx > line &&
        item.cx < vertical[index + 1],
    );
    if (row >= 0 && column >= 0 && column < 8) buckets[row][column].push(item);
  }
  return buckets.map((row) => row.map(cellFromItems));
}

function editDistance(left: string, right: string): number {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function weekdayMatch(text: string): number {
  const clean = normalizeOvalCell(text).replace(/\s/g, "");
  return OVAL_WEEKDAYS.findIndex((day) => {
    const target = day.toLowerCase();
    return clean === target || editDistance(clean, target) <= 2;
  });
}

function inferredColumnBoundaries(
  items: PositionedItem[],
  width: number,
): number[] {
  const matches = items
    .map((item) => ({ index: weekdayMatch(item.text), x: item.cx }))
    .filter((match) => match.index >= 0);
  const unique = new Map(matches.map((match) => [match.index, match.x]));
  if (unique.size >= 4) {
    const points = [...unique].map(([index, x]) => ({ index, x }));
    const meanIndex =
      points.reduce((sum, point) => sum + point.index, 0) / points.length;
    const meanX =
      points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const slope =
      points.reduce(
        (sum, point) => sum + (point.index - meanIndex) * (point.x - meanX),
        0,
      ) /
      points.reduce((sum, point) => sum + (point.index - meanIndex) ** 2, 0);
    const monday = meanX - slope * meanIndex;
    if (slope > width * 0.07) {
      return [
        0,
        ...Array.from(
          { length: 7 },
          (_, index) => monday + slope * (index - 0.5),
        ),
        width,
      ];
    }
  }
  const categoryWidth = width * 0.073;
  const dayWidth = (width - categoryWidth) / 7;
  return [
    0,
    categoryWidth,
    ...Array.from(
      { length: 7 },
      (_, index) => categoryWidth + dayWidth * (index + 1),
    ),
  ];
}

function rowsFromGeometry(
  items: PositionedItem[],
  width: number,
): OvalDetectedRow[] {
  const boundaries = inferredColumnBoundaries(items, width);
  const tolerance = Math.max(6, median(items.map((item) => item.height)) * 0.7);
  const clusters: Array<{ center: number; items: PositionedItem[] }> = [];
  for (const item of [...items].sort((a, b) => a.cy - b.cy)) {
    const cluster = clusters.find(
      (candidate) => Math.abs(candidate.center - item.cy) <= tolerance,
    );
    if (cluster) {
      cluster.items.push(item);
      cluster.center =
        cluster.items.reduce((sum, entry) => sum + entry.cy, 0) /
        cluster.items.length;
    } else {
      clusters.push({ center: item.cy, items: [item] });
    }
  }
  return clusters.map((cluster) => {
    const columns = Array.from({ length: 8 }, () => [] as PositionedItem[]);
    for (const item of cluster.items) {
      const column = boundaries.findIndex(
        (line, index) =>
          index < boundaries.length - 1 &&
          item.cx >= line &&
          item.cx < boundaries[index + 1],
      );
      if (column >= 0 && column < 8) columns[column].push(item);
    }
    return columns.map(cellFromItems);
  });
}

export function detectedItemsToOvalWeek(
  rawItems: OcrResultItem[],
  canvas: HTMLCanvasElement,
  weekStart: string,
  sourceName: string,
  sourceMimeType: string,
): OvalWeekDraft {
  const items = rawItems.filter((item) => item.text.trim()).map(itemGeometry);
  if (items.length < 20) {
    throw new Error(
      "Too little text was detected. Upload a sharper, uncropped sheet.",
    );
  }
  const grid = detectGrid(canvas);
  const rows =
    grid.vertical.length === 9 && grid.horizontal.length >= 8
      ? rowsFromGrid(items, grid.vertical, grid.horizontal)
      : rowsFromGeometry(items, canvas.width);
  return extractDetectedRowsWeek(
    rows,
    weekStart,
    sourceName,
    sourceMimeType,
    "ocr",
  );
}

async function imageCanvas(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(2.5, Math.max(1, 2800 / bitmap.width));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare the menu image");
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

async function pdfCanvas(file: File): Promise<HTMLCanvasElement> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const pdfDocument = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  }).promise;
  const page = await pdfDocument.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(3, Math.max(1.5, 2800 / base.width));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot render the PDF");
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  await pdfDocument.cleanup();
  await pdfDocument.loadingTask.destroy();
  return canvas;
}

/** Entirely local OCR: the source never leaves the committee member's browser. */
export async function extractBrowserOcrWeek(
  file: File,
  weekStart: string,
  onProgress?: Progress,
): Promise<OvalWeekDraft> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  onProgress?.(isPdf ? "Rendering PDF…" : "Preparing image…");
  const canvas = isPdf ? await pdfCanvas(file) : await imageCanvas(file);
  onProgress?.("Loading free OCR model…");
  const { PaddleOCR } = await import("@paddleocr/paddleocr-js");
  const ocr = await PaddleOCR.create({
    worker: true,
    lang: "en",
    ocrVersion: "PP-OCRv5",
    textRecognitionBatchSize: 8,
    textRecScoreThresh: 0.35,
    ortOptions: {
      backend: "wasm",
      wasmPaths: WASM_CDN,
      numThreads: 1,
      simd: true,
    },
  });
  try {
    onProgress?.("Reading table cells on this device…");
    const [result] = await ocr.predict(canvas, {
      textDetLimitSideLen: Math.min(
        3200,
        Math.max(canvas.width, canvas.height),
      ),
      textDetMaxSideLimit: 4096,
      textRecScoreThresh: 0.35,
    });
    if (!result) throw new Error("The local OCR model returned no result");
    onProgress?.("Rebuilding the seven-day menu…");
    return detectedItemsToOvalWeek(
      result.items,
      canvas,
      weekStart,
      file.name,
      file.type || "image/png",
    );
  } finally {
    await ocr.dispose();
  }
}
