import { describe, it, expect } from "vitest";
import { numberWord, outlookCompose } from "./utils";

describe("outlookCompose", () => {
  it("builds an Outlook web compose deep link", () => {
    expect(outlookCompose("president.council@woxsen.edu.in")).toBe(
      "https://outlook.office.com/mail/deeplink/compose?to=president.council%40woxsen.edu.in",
    );
  });

  it("encodes a plus-addressed mailbox so it survives the round trip", () => {
    // A bare `+` decodes to a space on Outlook's side and empties the To field.
    expect(outlookCompose("council+events@woxsen.edu.in")).toContain(
      "council%2Bevents%40woxsen.edu.in",
    );
  });

  it("trims surrounding whitespace from the address", () => {
    expect(outlookCompose("  vp@woxsen.edu.in  ")).toBe(
      "https://outlook.office.com/mail/deeplink/compose?to=vp%40woxsen.edu.in",
    );
  });

  it("handles empty input without producing a broken address", () => {
    expect(outlookCompose("")).toBe(
      "https://outlook.office.com/mail/deeplink/compose?to=",
    );
  });
});

describe("numberWord", () => {
  it("spells small counts for editorial copy", () => {
    expect(numberWord(1)).toBe("One");
    expect(numberWord(8)).toBe("Eight");
    expect(numberWord(20)).toBe("Twenty");
  });

  it("falls back to digits past the word list", () => {
    expect(numberWord(21)).toBe("21");
    expect(numberWord(100)).toBe("100");
  });
});
