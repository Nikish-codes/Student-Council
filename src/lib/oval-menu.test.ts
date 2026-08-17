import { describe, expect, it } from "vitest";

import {
  addIsoDays,
  createEmptyWeek,
  getOvalMealPhases,
  getOvalServiceDate,
  getWeekStart,
  inferOvalDiets,
  validateApprovableMeals,
} from "./oval-menu";

describe("Oval service date", () => {
  it("keeps the previous day before the 4 AM Kolkata boundary", () => {
    expect(getOvalServiceDate(new Date("2026-08-16T21:59:00.000Z"))).toBe("2026-08-16");
  });

  it("switches at exactly 4 AM Kolkata", () => {
    expect(getOvalServiceDate(new Date("2026-08-16T22:30:00.000Z"))).toBe("2026-08-17");
  });
});

describe("Oval week helpers", () => {
  it("finds Monday and builds seven sequential dates", () => {
    expect(getWeekStart("2026-08-23")).toBe("2026-08-17");
    const week = createEmptyWeek("2026-08-17");
    expect(week.days).toHaveLength(7);
    expect(week.days[6].menuDate).toBe("2026-08-23");
    expect(addIsoDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("Oval dietary and approval rules", () => {
  it("marks mixed dishes with every applicable diet", () => {
    expect(inferOvalDiets("Achari paneer / achari chicken curry")).toEqual([
      "veg",
      "nonveg",
    ]);
    expect(inferOvalDiets("Masala egg bhurji")).toEqual(["egg"]);
  });

  it("blocks empty and unresolved days", () => {
    const week = createEmptyWeek("2026-08-17");
    expect(validateApprovableMeals(week.days[0].meals)).toHaveLength(3);
  });
});

describe("Oval meal phases", () => {
  it("keeps every previous-day service completed before the 4 AM rollover", () => {
    expect(getOvalMealPhases(new Date("2026-08-16T21:00:00.000Z"))).toEqual({
      breakfast: "completed",
      lunch: "completed",
      dinner: "completed",
    });
  });

  it("identifies the currently serving meal in Kolkata", () => {
    const phases = getOvalMealPhases(new Date("2026-08-17T07:15:00.000Z"));
    expect(phases.lunch).toBe("serving");
    expect(phases.breakfast).toBe("completed");
    expect(phases.dinner).toBe("later");
  });
});
