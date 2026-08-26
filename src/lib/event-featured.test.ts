import { describe, expect, it } from "vitest";
import { findFeaturedEvent, resolveEventFeatured } from "./event-featured";

describe("event featuring permissions", () => {
  it("defaults new events to not featured", () => {
    expect(
      resolveEventFeatured({
        requested: false,
        canFeature: true,
      }),
    ).toBe(false);
  });

  it("ignores a forged feature request from a club or non-admin user", () => {
    expect(
      resolveEventFeatured({
        requested: true,
        canFeature: false,
      }),
    ).toBe(false);
  });

  it("preserves an existing value when a non-admin edits the event", () => {
    expect(
      resolveEventFeatured({
        requested: false,
        existing: true,
        canFeature: false,
      }),
    ).toBe(true);
  });

  it("allows a central admin to explicitly feature or unfeature", () => {
    expect(
      resolveEventFeatured({
        requested: true,
        existing: false,
        canFeature: true,
      }),
    ).toBe(true);
    expect(
      resolveEventFeatured({
        requested: false,
        existing: true,
        canFeature: true,
      }),
    ).toBe(false);
  });

  it("does not promote the next event when none is explicitly featured", () => {
    expect(
      findFeaturedEvent([
        { id: 1, featured: false },
        { id: 2, featured: false },
      ]),
    ).toBeUndefined();
    expect(
      findFeaturedEvent([
        { id: 1, featured: false },
        { id: 2, featured: true },
      ]),
    ).toMatchObject({ id: 2 });
  });
});
