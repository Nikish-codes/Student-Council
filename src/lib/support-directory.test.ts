import { describe, expect, it } from "vitest";
import {
  grievanceRecommendation,
  searchSupportDepartments,
  SUPPORT_DEPARTMENTS,
} from "@/lib/support-directory";

describe("support department search", () => {
  it("contains every department in the supplied guide", () => {
    expect(SUPPORT_DEPARTMENTS).toHaveLength(11);
  });

  it.each([
    ["my camu attendance is wrong", "bridge"],
    ["need help with my room ac", "gateway"],
    ["want to start a company", "trade-tower"],
    ["study abroad in japan", "international-relations"],
    ["need counselling for stress", "health-wellness-sports"],
    ["borrow a research book", "vithal-gandhi-centre"],
    ["generative ai hackathon", "airc"],
    ["final placement interview", "career-development-centre"],
  ])("ranks %s to %s", (query, expectedId) => {
    expect(searchSupportDepartments(query)[0]?.department.id).toBe(expectedId);
  });

  it("tolerates a small spelling mistake", () => {
    expect(searchSupportDepartments("attendence")[0]?.department.id).toBe(
      "bridge",
    );
  });
});

describe("grievance recommendation", () => {
  it("strongly recommends the form for sensitive concerns", () => {
    expect(grievanceRecommendation("I am being harassed")?.strength).toBe(
      "recommended",
    );
  });

  it("offers the form for unresolved concerns", () => {
    expect(
      grievanceRecommendation("my maintenance request is still not resolved")
        ?.strength,
    ).toBe("available");
  });

  it("does not force the form into an ordinary information search", () => {
    expect(grievanceRecommendation("where can I borrow a book")).toBeNull();
  });
});
