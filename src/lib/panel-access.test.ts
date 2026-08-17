import { describe, expect, it } from "vitest";

import { restrictedPanelDestination } from "./panel-access";

describe("restricted management roles", () => {
  it("pins a club president to only their assigned club editor", () => {
    expect(
      restrictedPanelDestination("club_lead", 42, "/management/clubs/42"),
    ).toBeNull();
    expect(
      restrictedPanelDestination("club_lead", 42, "/management/clubs/7"),
    ).toBe("/management/clubs/42");
    expect(
      restrictedPanelDestination("club_lead", 42, "/management/events"),
    ).toBe("/management/clubs/42");
    expect(
      restrictedPanelDestination("club_lead", 42, "/eventmanagement"),
    ).toBe("/management/clubs/42");
  });

  it("gives an unassigned club president no route beyond the safe club screen", () => {
    expect(
      restrictedPanelDestination("club_lead", null, "/management/clubs"),
    ).toBeNull();
    expect(restrictedPanelDestination("club_lead", null, "/management")).toBe(
      "/management/clubs",
    );
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
