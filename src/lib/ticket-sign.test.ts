import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.TICKET_SECRET = "test-secret-do-not-use-in-prod";
});

// Imported after env is set (signTicket reads the secret lazily per call).
import { signTicket, ticketToken, parseScan, verifyScan } from "./ticket-sign";

const CODE = "WSC-ABCD-EFGH";

describe("signTicket", () => {
  it("is deterministic and 16 base64url chars", () => {
    const sig = signTicket(CODE);
    expect(sig).toBe(signTicket(CODE));
    expect(sig).toMatch(/^[A-Za-z0-9_-]{16}$/);
  });
  it("differs per code", () => {
    expect(signTicket(CODE)).not.toBe(signTicket("WSC-ABCD-EFGI"));
  });
});

describe("verifyScan", () => {
  it("accepts a valid compact token", () => {
    expect(verifyScan(ticketToken(CODE))).toBe(CODE);
  });
  it("accepts a valid ticket URL with ?k=", () => {
    const url = `https://host.example/t/${CODE}?k=${signTicket(CODE)}`;
    expect(verifyScan(url)).toBe(CODE);
  });
  it("rejects a tampered signature", () => {
    expect(verifyScan(`${CODE}.0000000000000000`)).toBeNull();
  });
  it("rejects a URL whose signature does not match the code", () => {
    const url = `https://host.example/t/WSC-ZZZZ-ZZZZ?k=${signTicket(CODE)}`;
    expect(verifyScan(url)).toBeNull();
  });
  it("accepts a bare typed code (no signature) and upper-cases it", () => {
    expect(verifyScan("wsc-abcd-efgh")).toBe(CODE);
  });
  it("returns null on empty/junk input", () => {
    expect(verifyScan("")).toBeNull();
    expect(verifyScan("   ")).toBeNull();
  });
});

describe("parseScan", () => {
  it("splits a compact token into code + signature", () => {
    expect(parseScan(`${CODE}.sigvalue`)).toEqual({
      code: CODE,
      sig: "sigvalue",
    });
  });
  it("extracts code + sig from a URL", () => {
    expect(parseScan(`https://h/t/${CODE}?k=xyz`)).toEqual({
      code: CODE,
      sig: "xyz",
    });
  });
});
