import { describe, expect, it } from "vitest";

import {
  requiredPasswordDestination,
  restrictedPanelDestination,
} from "./panel-access";

describe("restricted management roles", () => {
  it("forces temporary-password users through password setup exactly once", () => {
    expect(requiredPasswordDestination(true, "/club-management")).toBe(
      "/management/change-password",
    );
    expect(
      requiredPasswordDestination(true, "/management/change-password"),
    ).toBeNull();
    expect(requiredPasswordDestination(false, "/club-management")).toBeNull();
  });

  it("pins a club president to Club Studio", () => {
    expect(
      restrictedPanelDestination("club_lead", 42, "/management/clubs/42"),
    ).toBe("/club-management");
    expect(
      restrictedPanelDestination("club_lead", 42, "/management/clubs/7"),
    ).toBe("/club-management");
    expect(
      restrictedPanelDestination("club_lead", 42, "/management/events"),
    ).toBe("/club-management");
    expect(
      restrictedPanelDestination("club_lead", 42, "/eventmanagement"),
    ).toBe("/club-management");
    expect(
      restrictedPanelDestination("club_lead", 42, "/club-management/events"),
    ).toBeNull();
  });

  it("routes an unassigned legacy club lead to Club Studio", () => {
    expect(
      restrictedPanelDestination("club_lead", null, "/management/clubs"),
    ).toBe("/club-management");
    expect(restrictedPanelDestination("club_lead", null, "/management")).toBe(
      "/club-management",
    );
  });

  it("limits Operations to approval and event operating surfaces", () => {
    expect(restrictedPanelDestination("operations", null, "/management/approvals")).toBeNull();
    expect(restrictedPanelDestination("operations", null, "/management/events/2/registrations")).toBeNull();
    expect(restrictedPanelDestination("operations", null, "/management/users")).toBe("/management/approvals");
    expect(restrictedPanelDestination("operations", null, "/management/settings")).toBe("/management/approvals");
  });

  it("keeps food committee and full operations destinations separate", () => {
    expect(
      restrictedPanelDestination(
        "food_committee_member",
        null,
        "/management/users",
      ),
    ).toBe("/management/oval");
    expect(
      restrictedPanelDestination("super_admin", null, "/management/users"),
    ).toBeNull();
  });
});
