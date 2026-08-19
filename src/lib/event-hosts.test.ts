import { describe, expect, it } from "vitest";

import { hostingClubIdsFromForm, primaryHostingClubId } from "./event-hosts";

describe("event hosting clubs", () => {
  it("accepts multiple unique hosting clubs", () => {
    const form = new FormData();
    form.append("clubIds", "8");
    form.append("clubIds", "12");
    form.append("clubIds", "8");

    expect(hostingClubIdsFromForm(form)).toEqual([8, 12]);
  });

  it("always restores the active Club Studio club", () => {
    const form = new FormData();
    form.append("clubIds", "12");

    expect(hostingClubIdsFromForm(form, 8)).toEqual([8, 12]);
  });

  it("keeps a selected primary club and otherwise chooses the first host", () => {
    expect(primaryHostingClubId([8, 12], 12)).toBe(12);
    expect(primaryHostingClubId([8, 12], 30)).toBe(8);
    expect(primaryHostingClubId([])).toBeNull();
  });
});
