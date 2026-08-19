import { describe, expect, it } from "vitest";
import { membershipAllows } from "./club-permissions";

const member = {
  membershipRole: "member" as const,
  canEditPage: true,
  canManageEvents: false,
  canManageMedia: true,
  isActive: true,
};

describe("club membership permissions", () => {
  it("applies independent member permission flags", () => {
    expect(membershipAllows(member, "edit_page")).toBe(true);
    expect(membershipAllows(member, "manage_events")).toBe(false);
    expect(membershipAllows(member, "manage_media")).toBe(true);
    expect(membershipAllows(member, "manage_team")).toBe(false);
  });

  it("gives an active president every club permission", () => {
    const president = { ...member, membershipRole: "president" as const, canEditPage: false, canManageMedia: false };
    expect(membershipAllows(president, "manage_team")).toBe(true);
    expect(membershipAllows(president, "manage_events")).toBe(true);
  });

  it("denies every permission after revocation", () => {
    expect(membershipAllows({ ...member, isActive: false }, "edit_page")).toBe(false);
  });
});
