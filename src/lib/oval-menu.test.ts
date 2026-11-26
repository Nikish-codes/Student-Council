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
  it("keeps the same day until 10 PM Kolkata", () => {
    expect(getOvalServiceDate(new Date("2026-08-16T16:29:00.000Z"))).toBe(
      "2026-08-16",
    );
  });

  it("switches to the next day at exactly 10 PM Kolkata", () => {
    expect(getOvalServiceDate(new Date("2026-08-16T16:30:00.000Z"))).toBe(
      "2026-08-17",
    );
  });

  it("stays on that day after midnight", () => {
    expect(getOvalServiceDate(new Date("2026-08-16T20:30:00.000Z"))).toBe(
      "2026-08-17",
    );
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
    expect(validateApprovableMeals(week.days[0].meals)).toHaveLength(5);
  });
});

describe("Oval meal phases", () => {
  it("shows the next day's breakfast as up next after the 10 PM rollover", () => {
    const upcomingDay = {
      breakfast: "upcoming",
      lunch: "later",
      dinner: "later",
      jain_lunch: "later",
      jain_dinner: "later",
    };
    expect(getOvalMealPhases(new Date("2026-08-16T17:00:00.000Z"))).toEqual(
      upcomingDay,
    );
    expect(getOvalMealPhases(new Date("2026-08-16T21:00:00.000Z"))).toEqual(
      upcomingDay,
    );
  });

  it("identifies the currently serving meal in Kolkata", () => {
    const phases = getOvalMealPhases(new Date("2026-08-17T07:15:00.000Z"));
    expect(phases.lunch).toBe("serving");
    expect(phases.jain_lunch).toBe("serving");
    expect(phases.breakfast).toBe("completed");
    expect(phases.dinner).toBe("later");
    expect(phases.jain_dinner).toBe("later");
  });
});
