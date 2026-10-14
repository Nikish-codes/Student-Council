import type { SportShootout, SportShootoutKick } from "@/lib/schemas";

export const SHOOTOUT_REGULATION_KICKS = 5;

export type ShootoutState = {
  scoreA: number;
  scoreB: number;
  takenA: number;
  takenB: number;
  slots: number;
  nextTeam: "a" | "b" | null;
  decided: boolean;
  winner: "a" | "b" | null;
  suddenDeath: boolean;
};

function kicksOf(shootout: SportShootout): SportShootoutKick[] {
  return Array.isArray(shootout.kicks) ? shootout.kicks : [];
}

export function kickOrder(firstTeam: "a" | "b", index: number): "a" | "b" {
  const other = firstTeam === "a" ? "b" : "a";
  return index % 2 === 0 ? firstTeam : other;
}

export function readShootout(shootout: SportShootout): ShootoutState {
  const kicks = kicksOf(shootout);
  const first = shootout.firstTeam === "b" ? "b" : "a";

  let scoreA = 0;
  let scoreB = 0;
  let takenA = 0;
  let takenB = 0;
  for (const kick of kicks) {
    if (kick.team === "a") {
      takenA++;
      if (kick.scored) scoreA++;
    } else {
      takenB++;
      if (kick.scored) scoreB++;
    }
  }

  const left = (taken: number) =>
    Math.max(0, SHOOTOUT_REGULATION_KICKS - taken);
  const inRegulation =
    takenA < SHOOTOUT_REGULATION_KICKS || takenB < SHOOTOUT_REGULATION_KICKS;

  let winner: "a" | "b" | null = null;

  if (inRegulation) {
    // A side is out of reach once the other cannot catch it with the kicks
    // it has left.
    if (scoreA > scoreB + left(takenB)) winner = "a";
    else if (scoreB > scoreA + left(takenA)) winner = "b";
  } else if (takenA === takenB && scoreA !== scoreB) {
    winner = scoreA > scoreB ? "a" : "b";
  }

  const decided = winner !== null;

  return {
    scoreA,
    scoreB,
    takenA,
    takenB,
    slots: Math.max(SHOOTOUT_REGULATION_KICKS, takenA, takenB),
    nextTeam: decided ? null : kickOrder(first, kicks.length),
    decided,
    winner,
    suddenDeath:
      takenA >= SHOOTOUT_REGULATION_KICKS &&
      takenB >= SHOOTOUT_REGULATION_KICKS,
  };
}

/** The marks for one side, oldest first, padded out to the rendered slots. */
export function kicksForTeam(
  shootout: SportShootout,
  team: "a" | "b",
  slots: number,
): (boolean | null)[] {
  const taken = kicksOf(shootout)
    .filter((k) => k.team === team)
    .map((k) => k.scored);
  const row: (boolean | null)[] = [...taken];
  while (row.length < slots) row.push(null);
  return row;
}

export function newShootout(firstTeam: "a" | "b" = "a"): SportShootout {
  return { firstTeam, kicks: [] };
}

export function addKick(
  shootout: SportShootout,
  team: "a" | "b",
  scored: boolean,
): SportShootout {
  return { ...shootout, kicks: [...kicksOf(shootout), { team, scored }] };
}

export function undoKick(shootout: SportShootout): SportShootout {
  return { ...shootout, kicks: kicksOf(shootout).slice(0, -1) };
}
