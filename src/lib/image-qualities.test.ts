import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

describe("next/image quality values", () => {
  it("only uses qualities allowed by images.qualities in next.config.ts", () => {
    const config = readFileSync("next.config.ts", "utf8");
    const match = config.match(/qualities:\s*\[([^\]]*)\]/);
    expect(match).not.toBeNull();
    const allowed = match![1].split(",").map((v) => Number(v.trim()));

    const used: string[] = [];
    for (const file of sourceFiles("src")) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/quality(?:=\{|\s*=\s*)(\d+)/g)) {
        if (!allowed.includes(Number(m[1]))) used.push(`${file}: ${m[1]}`);
      }
    }
    expect(used).toEqual([]);
  });
});
