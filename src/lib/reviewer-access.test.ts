import { describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ role: "admin", signedIn: true }));
vi.mock("@/auth", () => ({
  auth: async () => session.signedIn ? { user: { id: "1", role: session.role } } : null,
}));
vi.mock("@/db/client", () => ({ db: {} }));

import { canPublish, requireReviewer } from "./rbac";

describe("club submission reviewer permissions", () => {
  it.each(["admin", "super_admin", "operations"])("allows %s to review submissions", async (role) => {
    session.role = role;
    session.signedIn = true;
    await expect(requireReviewer()).resolves.toMatchObject({ role });
  });
  it.each(["club_lead", "sports_lead", "editor", "council_member", "food_committee_member", "viewer"])("rejects %s", async (role) => {
    session.role = role;
    session.signedIn = true;
    await expect(requireReviewer()).rejects.toThrow("FORBIDDEN");
  });
  it("requires authentication and leaves general direct-publication permissions unchanged", async () => {
    session.signedIn = false;
    await expect(requireReviewer()).rejects.toThrow("UNAUTHENTICATED");
    expect(canPublish("admin")).toBe(false);
  });
});
