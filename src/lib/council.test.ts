import { describe, it, expect } from "vitest";
import { attachCoLeads, coLeadBase, leadBase, unpairedCoLeads } from "./council";

const m = (id: string, role: string, memberType = "member") => ({
  id,
  role,
  memberType,
});

describe("coLeadBase", () => {
  it("extracts the base from a co-lead role", () => {
    expect(coLeadBase("Sports Co Lead")).toBe("sports");
    expect(coLeadBase("Student Welfare Co Lead")).toBe("student welfare");
  });

  it("tolerates hyphenation, casing and stray whitespace", () => {
    expect(coLeadBase("Tech Co-Lead")).toBe("tech");
    expect(coLeadBase("  TECH   CO LEAD  ")).toBe("tech");
    expect(coLeadBase("Tech CoLead")).toBe("tech");
  });

  it("returns null for a plain lead or an unrelated role", () => {
    expect(coLeadBase("Tech Lead")).toBeNull();
    expect(coLeadBase("Vice President")).toBeNull();
    expect(coLeadBase("Co Lead")).toBeNull(); // no base to pair on
  });
});

describe("leadBase", () => {
  it("extracts the base from a lead role", () => {
    expect(leadBase("Tech Lead")).toBe("tech");
    expect(leadBase("PR & Media Lead")).toBe("pr & media");
  });

  it("does not treat a co-lead as a lead", () => {
    // Otherwise "Tech Co Lead" would resolve to base "tech co" and, worse,
    // register itself as the lead the co-leads pair against.
    expect(leadBase("Tech Co Lead")).toBeNull();
    expect(leadBase("Tech Co-Lead")).toBeNull();
  });

  it("returns null for roles that aren't leads", () => {
    expect(leadBase("Treasurer")).toBeNull();
    expect(leadBase("SR SOB UG")).toBeNull();
  });
});

describe("attachCoLeads", () => {
  it("groups multiple co-leads under one lead", () => {
    const rows = [
      m("1", "Sports Lead"),
      m("2", "Sports Co Lead", "co_lead"),
      m("3", "Sports Co Lead", "co_lead"),
    ];
    const map = attachCoLeads(rows);
    expect(map.get("1")?.map((x) => x.id)).toEqual(["2", "3"]);
  });

  it("leaves a lead with no co-leads out of the map entirely", () => {
    const map = attachCoLeads([m("1", "Design Lead"), m("2", "Tech Lead")]);
    expect(map.size).toBe(0);
    expect(map.get("1")).toBeUndefined();
  });

  it("drops a co-lead whose lead is missing instead of throwing", () => {
    // The sheet has a Tech Co Lead slot; if nobody holds Tech Lead there is
    // nothing to hang them off, but the page must still render.
    const map = attachCoLeads([m("9", "Tech Co Lead", "co_lead")]);
    expect(map.size).toBe(0);
  });

  it("keeps separate leads' co-leads apart", () => {
    const rows = [
      m("1", "Sports Lead"),
      m("2", "Operations Lead"),
      m("3", "Sports Co Lead", "co_lead"),
      m("4", "Operations Co Lead", "co_lead"),
    ];
    const map = attachCoLeads(rows);
    expect(map.get("1")?.map((x) => x.id)).toEqual(["3"]);
    expect(map.get("2")?.map((x) => x.id)).toEqual(["4"]);
  });

  it("ignores a member marked co_lead whose role isn't a co-lead role", () => {
    const map = attachCoLeads([m("1", "Tech Lead"), m("2", "Treasurer", "co_lead")]);
    expect(map.size).toBe(0);
  });
});

describe("unpairedCoLeads", () => {
  it("reports co-leads with no matching lead", () => {
    const rows = [
      m("1", "Sports Lead"),
      m("2", "Sports Co Lead", "co_lead"),
      m("3", "Tech Co Lead", "co_lead"),
    ];
    expect(unpairedCoLeads(rows).map((x) => x.id)).toEqual(["3"]);
  });

  it("is empty when every co-lead found a lead", () => {
    const rows = [m("1", "Sports Lead"), m("2", "Sports Co Lead", "co_lead")];
    expect(unpairedCoLeads(rows)).toEqual([]);
  });
});
