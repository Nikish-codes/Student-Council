import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { createEmptyWeek, makeOvalItem } from "@/lib/oval-menu";

const client = createClient({
  url: `file:${join(mkdtempSync(join(tmpdir(), "oval-publish-")), "test.db")}`,
});
const database = drizzle(client, { schema });
const revalidatePath = vi.fn();
vi.mock("@/db/client", () => ({
  get db() {
    return database;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error("REDIRECT:" + path);
  },
}));
vi.mock("@/lib/rbac", () => ({
  requireOvalManager: async () => ({ id: "1", role: "super_admin" }),
}));

beforeAll(async () => {
  for (const file of readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    for (const statement of readFileSync("drizzle/" + file, "utf8")
      .split("--> statement-breakpoint")
      .filter((s) => s.trim()))
      await client.execute(statement);
  }
  await client.execute(
    "INSERT INTO mp_users (id, name, email) VALUES (1, 'Admin', 'admin@example.test')",
  );
});

function weekWith(dish: string) {
  const week = createEmptyWeek("2026-11-16");
  for (const day of week.days)
    for (const meal of Object.keys(day.meals) as Array<keyof typeof day.meals>)
      day.meals[meal] = [makeOvalItem("Main", `${dish} ${meal}`)];
  return week;
}

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) fd.set(key, value);
  return fd;
}

describe("Oval publishing", () => {
  it("keeps the approved menu public while a new version is a draft", async () => {
    const actions = await import("@/app/management/(panel)/oval/actions");
    const { getApprovedOvalDay } = await import("@/lib/oval-data");

    await expect(
      actions.saveOvalWeek(form({ payload: JSON.stringify(weekWith("Poha")) })),
    ).rejects.toThrow("REDIRECT:");
    expect(await getApprovedOvalDay("2026-11-18")).toBeNull();

    await expect(
      actions.approveOvalWeek(form({ weekStart: "2026-11-16" })),
    ).rejects.toThrow("approvedWeek=7&skipped=0");
    expect((await getApprovedOvalDay("2026-11-18"))?.meals.lunch[0].dish).toBe(
      "Poha lunch",
    );

    revalidatePath.mockClear();
    await expect(
      actions.saveOvalWeek(form({ payload: JSON.stringify(weekWith("Upma")) })),
    ).rejects.toThrow("REDIRECT:");
    expect(revalidatePath.mock.calls).toEqual([["/management/oval"]]);
    expect((await getApprovedOvalDay("2026-11-18"))?.meals.lunch[0].dish).toBe(
      "Poha lunch",
    );

    revalidatePath.mockClear();
    await expect(
      actions.approveOvalDay(form({ menuDate: "2026-11-18" })),
    ).rejects.toThrow("REDIRECT:");
    expect(revalidatePath.mock.calls).toEqual([
      ["/management/oval"],
      ["/oval/2026-11-18"],
    ]);
    expect((await getApprovedOvalDay("2026-11-18"))?.meals.lunch[0].dish).toBe(
      "Upma lunch",
    );
    expect((await getApprovedOvalDay("2026-11-19"))?.meals.lunch[0].dish).toBe(
      "Poha lunch",
    );

    await expect(
      actions.returnOvalDayToDraft(form({ menuDate: "2026-11-18" })),
    ).rejects.toThrow("REDIRECT:");
    expect(await getApprovedOvalDay("2026-11-18")).toBeNull();
  });
});
