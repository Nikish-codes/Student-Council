"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { ovalMenuDays } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { getOvalServiceDate } from "@/lib/oval-date";
import {
  addIsoDays,
  getWeekStart,
  normalizeOvalMeals,
  ovalWeekDraftSchema,
  validateApprovableMeals,
} from "@/lib/oval-menu";
import { requireOvalManager } from "@/lib/rbac";
import { siteUrl } from "@/lib/site-url";

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function refreshPublicOval(dates: string[]) {
  revalidatePath("/management/oval");
  for (const date of dates) revalidatePath(`/oval/${date}`);
  const today = getOvalServiceDate();
  if (!dates.includes(today)) return;
  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      await fetch(`${siteUrl()}/oval/${today}`, {
        cache: "no-store",
        redirect: "manual",
      });
    } catch {}
  });
}

export async function saveOvalWeek(formData: FormData) {
  const user = await requireOvalManager();
  const raw = field(formData, "payload");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(
      "The weekly menu payload is invalid. Refresh and try again.",
    );
  }

  const parsed = ovalWeekDraftSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid weekly menu");
  }
  const draft = parsed.data;
  if (getWeekStart(draft.weekStart) !== draft.weekStart) {
    throw new Error("Week start must be a Monday");
  }
  const hasExactWeekDates = draft.days.every(
    (day, index) => day.menuDate === addIsoDays(draft.weekStart, index),
  );
  if (!hasExactWeekDates) {
    throw new Error("The menu must contain Monday through Sunday in order");
  }

  const dates = draft.days.map((day) => day.menuDate);
  const existing = await db
    .select()
    .from(ovalMenuDays)
    .where(inArray(ovalMenuDays.menuDate, dates));
  const existingByDate = new Map(existing.map((row) => [row.menuDate, row]));
  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    for (const day of draft.days) {
      const previous = existingByDate.get(day.menuDate);
      const changed =
        !previous ||
        JSON.stringify(previous.meals) !== JSON.stringify(day.meals);
      const status = changed ? "draft" : (previous?.status ?? "draft");

      await tx
        .insert(ovalMenuDays)
        .values({
          menuDate: day.menuDate,
          weekStart: draft.weekStart,
          status,
          meals: day.meals,
          sourceName: draft.sourceName ?? null,
          sourceMimeType: draft.sourceMimeType ?? null,
          importMethod: draft.importMethod,
          importedByUserId: Number(user.id),
          approvedByUserId:
            status === "approved" ? previous?.approvedByUserId : null,
          approvedAt: status === "approved" ? previous?.approvedAt : null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: ovalMenuDays.menuDate,
          set: {
            weekStart: draft.weekStart,
            status,
            meals: day.meals,
            sourceName: draft.sourceName ?? null,
            sourceMimeType: draft.sourceMimeType ?? null,
            importMethod: draft.importMethod,
            importedByUserId: Number(user.id),
            approvedByUserId:
              status === "approved" ? previous?.approvedByUserId : null,
            approvedAt: status === "approved" ? previous?.approvedAt : null,
            updatedAt: now,
          },
        });
    }
  });

  await logAudit({
    actorUserId: Number(user.id),
    action: "oval.week.saved",
    targetId: draft.weekStart,
    meta: {
      importMethod: draft.importMethod,
      sourceName: draft.sourceName ?? null,
      daysResetToDraft: draft.days.filter((day) => {
        const previous = existingByDate.get(day.menuDate);
        return (
          previous?.status === "approved" &&
          JSON.stringify(previous.meals) !== JSON.stringify(day.meals)
        );
      }).length,
    },
  });

  revalidatePath("/management/oval");
  redirect(`/management/oval?week=${draft.weekStart}&saved=1`);
}

export async function approveOvalDay(formData: FormData) {
  const user = await requireOvalManager();
  const menuDate = field(formData, "menuDate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(menuDate))
    throw new Error("Invalid menu date");

  const row = await db.query.ovalMenuDays.findFirst({
    where: eq(ovalMenuDays.menuDate, menuDate),
  });
  if (!row) throw new Error("Save this day before approving it");
  const errors = validateApprovableMeals(normalizeOvalMeals(row.meals));
  if (errors.length) throw new Error(`Cannot approve: ${errors.join("; ")}`);

  const now = new Date().toISOString();
  await db
    .update(ovalMenuDays)
    .set({
      status: "approved",
      publishedMeals: normalizeOvalMeals(row.meals),
      approvedByUserId: Number(user.id),
      approvedAt: now,
      updatedAt: now,
    })
    .where(eq(ovalMenuDays.menuDate, menuDate));

  await logAudit({
    actorUserId: Number(user.id),
    action: "oval.day.approved",
    targetId: menuDate,
  });
  refreshPublicOval([menuDate]);
  redirect(`/management/oval?week=${row.weekStart}&approved=${menuDate}`);
}

export async function approveOvalWeek(formData: FormData) {
  const user = await requireOvalManager();
  const weekStart = field(formData, "weekStart");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(weekStart) ||
    getWeekStart(weekStart) !== weekStart
  )
    throw new Error("Invalid week");

  const rows = await db
    .select()
    .from(ovalMenuDays)
    .where(eq(ovalMenuDays.weekStart, weekStart));
  const approved: string[] = [];
  let skipped = 0;
  const now = new Date().toISOString();
  for (const row of rows) {
    if (row.status === "approved") continue;
    const meals = normalizeOvalMeals(row.meals);
    if (validateApprovableMeals(meals).length) {
      skipped += 1;
      continue;
    }
    await db
      .update(ovalMenuDays)
      .set({
        status: "approved",
        publishedMeals: meals,
        approvedByUserId: Number(user.id),
        approvedAt: now,
        updatedAt: now,
      })
      .where(eq(ovalMenuDays.menuDate, row.menuDate));
    approved.push(row.menuDate);
  }

  await logAudit({
    actorUserId: Number(user.id),
    action: "oval.week.approved",
    targetId: weekStart,
    meta: { approved, skipped },
  });
  refreshPublicOval(approved);
  redirect(
    `/management/oval?week=${weekStart}&approvedWeek=${approved.length}&skipped=${skipped}`,
  );
}

export async function returnOvalDayToDraft(formData: FormData) {
  const user = await requireOvalManager();
  const menuDate = field(formData, "menuDate");
  const row = await db.query.ovalMenuDays.findFirst({
    where: eq(ovalMenuDays.menuDate, menuDate),
  });
  if (!row) throw new Error("Menu day not found");

  await db
    .update(ovalMenuDays)
    .set({
      status: "draft",
      publishedMeals: null,
      approvedByUserId: null,
      approvedAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(ovalMenuDays.menuDate, menuDate));
  await logAudit({
    actorUserId: Number(user.id),
    action: "oval.day.returned_to_draft",
    targetId: menuDate,
  });
  refreshPublicOval([menuDate]);
  redirect(`/management/oval?week=${row.weekStart}&draft=${menuDate}`);
}
