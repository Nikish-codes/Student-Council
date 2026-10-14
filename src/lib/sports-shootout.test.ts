import { describe, expect, it } from "vitest";
import {
  addKick,
  kickOrder,
  kicksForTeam,
  newShootout,
  readShootout,
  undoKick,
} from "./sports-shootout";
import type { SportShootout } from "./schemas";

/** "a" scores, "A" misses — read left to right in kick order. */
function build(sequence: string, firstTeam: "a" | "b" = "a"): SportShootout {
  let shootout = newShootout(firstTeam);
  [...sequence].forEach((mark, i) => {
    const team = kickOrder(firstTeam, i);
    shootout = addKick(shootout, team, mark === "o");
  });
  return shootout;
}

describe("kickOrder", () => {
  it("alternates from whoever goes first", () => {
    expect([0, 1, 2, 3].map((i) => kickOrder("a", i))).toEqual([
      "a",
      "b",
      "a",
      "b",
    ]);
    expect([0, 1, 2, 3].map((i) => kickOrder("b", i))).toEqual([
      "b",
      "a",
      "b",
      "a",
    ]);
  });
});

describe("readShootout", () => {
  it("starts empty, with the first team to kick", () => {
    const s = readShootout(newShootout("b"));
    expect(s.scoreA).toBe(0);
    expect(s.nextTeam).toBe("b");
    expect(s.decided).toBe(false);
    expect(s.slots).toBe(5);
  });

  it("tallies only the kicks that scored", () => {
    // a o | b o | a x | b o  -> a 1, b 2
    const s = readShootout(build("ooxo"));
    expect([s.scoreA, s.scoreB]).toEqual([1, 2]);
    expect([s.takenA, s.takenB]).toEqual([2, 2]);
  });

  it("keeps alternating while the shootout is live", () => {
    expect(readShootout(build("o")).nextTeam).toBe("b");
    expect(readShootout(build("oo")).nextTeam).toBe("a");
  });

  it("ends it early once a side cannot be caught", () => {
    // a scores three, b misses three: b can still take two, a leads by three.
    const s = readShootout(build("oxoxox"));
    expect(s.winner).toBe("a");
    expect(s.decided).toBe(true);
    expect(s.nextTeam).toBeNull();
  });

  it("does not call it early while the other side can still catch up", () => {
    const s = readShootout(build("oxox"));
    expect(s.winner).toBeNull();
    expect(s.decided).toBe(false);
  });

  it("decides on the better record after five each", () => {
    const s = readShootout(build("ooooxooooo"));
    expect([s.scoreA, s.scoreB]).toEqual([4, 5]);
    expect(s.winner).toBe("b");
  });

  it("goes to sudden death when five each are level", () => {
    const s = readShootout(build("oooooooooo"));
    expect([s.scoreA, s.scoreB]).toEqual([5, 5]);
    expect(s.decided).toBe(false);
    expect(s.suddenDeath).toBe(true);
    expect(s.nextTeam).toBe("a");
  });

  it("stays live in sudden death until a round separates them", () => {
    const level = readShootout(build("ooooooooooo"));
    expect(level.decided).toBe(false);

    const settled = readShootout(build("ooooooooooox"));
    expect(settled.winner).toBe("a");
    expect(settled.suddenDeath).toBe(true);
  });

  it("does not decide mid-round in sudden death", () => {
    const s = readShootout(build("oooooooooo" + "o"));
    expect(s.takenA).toBe(6);
    expect(s.takenB).toBe(5);
    expect(s.decided).toBe(false);
  });

  it("grows the rendered slots past five in sudden death", () => {
    expect(readShootout(build("oooooooooo")).slots).toBe(5);
    expect(readShootout(build("ooooooooooox")).slots).toBe(6);
  });

  it("honours b kicking first", () => {
    const s = readShootout(build("ox", "b"));
    expect([s.scoreB, s.scoreA]).toEqual([1, 0]);
    expect(s.takenB).toBe(1);
  });
});

describe("kicksForTeam", () => {
  it("pads the row out to the rendered slots", () => {
    expect(kicksForTeam(build("ox"), "a", 5)).toEqual([
      true,
      null,
      null,
      null,
      null,
    ]);
    expect(kicksForTeam(build("ox"), "b", 5)).toEqual([
      false,
      null,
      null,
      null,
      null,
    ]);
  });
});

describe("undoKick", () => {
  it("removes the most recent kick and hands the turn back", () => {
    const after = undoKick(build("oox"));
    const s = readShootout(after);
    expect([s.takenA, s.takenB]).toEqual([1, 1]);
    expect(s.nextTeam).toBe("a");
  });

  it("is safe on an empty shootout", () => {
    expect(readShootout(undoKick(newShootout())).takenA).toBe(0);
  });
});
