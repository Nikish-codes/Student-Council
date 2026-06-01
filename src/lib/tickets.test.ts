import { describe, it, expect } from "vitest";
import { generateTicketCode, newId } from "./tickets";

describe("generateTicketCode", () => {
  it("matches the WSC-XXXX-XXXX format", () => {
    expect(generateTicketCode()).toMatch(/^WSC-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });
  it("avoids ambiguous characters (0,O,1,I)", () => {
    for (let i = 0; i < 200; i++) {
      const body = generateTicketCode().replace("WSC-", "").replace("-", "");
      expect(body).not.toMatch(/[01OI]/);
    }
  });
  it("is reasonably unique", () => {
    const set = new Set(Array.from({ length: 500 }, () => generateTicketCode()));
    expect(set.size).toBeGreaterThan(495);
  });
});

describe("newId", () => {
  it("returns a uuid", () => {
    expect(newId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
