import type { SportMatchEvent } from "@/lib/schemas";

export const SCORING_EVENT_TYPES = new Set([
  "goal",
  "own_goal",
  "penalty_goal",
]);

export const CARD_EVENT_TYPES = new Set(["yellow", "red", "second_yellow"]);

export const CELEBRATION_MS = {
  takeover: 7000,
  flourish: 5000,
  card: 5400,
} as const;

export const EVENT_LABELS: Record<string, string> = {
  goal: "Goal",
  own_goal: "Own goal",
  penalty_goal: "Penalty",
  penalty_miss: "Penalty missed",
  yellow: "Yellow card",
  second_yellow: "Second yellow",
  red: "Red card",
  sub: "Substitution",
  save: "Save",
  timeout: "Timeout",
  other: "Event",
};

export const HALT_PRESETS = [
  { id: "power_cut", title: "Match Halted", subtitle: "Power Interruption" },
  { id: "floodlight", title: "Match Halted", subtitle: "Floodlight Failure" },
  { id: "rain", title: "Match Suspended", subtitle: "Weather Conditions" },
  {
    id: "injury",
    title: "Play Stopped",
    subtitle: "Injury — Medical Staff On Field",
  },
  {
    id: "crowd",
    title: "Match Paused",
    subtitle: "Please Clear The Field Of Play",
  },
  {
    id: "referee",
    title: "Play Stopped",
    subtitle: "Referee Decision Under Review",
  },
  { id: "equipment", title: "Match Paused", subtitle: "Equipment Check" },
] as const;

export function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type.replace(/_/g, " ");
}

export const TEAM_A_COLOR = "#38bdf8";
export const TEAM_B_COLOR = "#fb7185";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function teamColor(side: "a" | "b", override?: string): string {
  const fallback = side === "a" ? TEAM_A_COLOR : TEAM_B_COLOR;
  if (!override) return fallback;
  const trimmed = override.trim();
  return HEX.test(trimmed) ? trimmed : fallback;
}

export function eventKey(event: SportMatchEvent, index: number): string {
  return (
    event.id ??
    `legacy-${index}-${event.time}-${event.team}-${event.type}-${event.description ?? ""}`
  );
}

export function celebrationMs(
  event: SportMatchEvent,
  fallback: "takeover" | "flourish",
): number {
  if (CARD_EVENT_TYPES.has(event.type)) return CELEBRATION_MS.card;
  return (event.style ?? fallback) === "flourish"
    ? CELEBRATION_MS.flourish
    : CELEBRATION_MS.takeover;
}
