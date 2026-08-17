import {
  SPORT_LABELS,
  SPORT_DIVISION_LABELS,
  type SportType,
  type SportDivision,
} from "@/lib/schemas";

export const SPORT_TYPE_OPTIONS: { value: string; label: string }[] =
  (Object.keys(SPORT_LABELS) as SportType[]).map((k) => ({
    value: k,
    label: SPORT_LABELS[k],
  }));

export const SPORT_DIVISION_OPTIONS: { value: string; label: string }[] =
  (Object.keys(SPORT_DIVISION_LABELS) as SportDivision[]).map((k) => ({
    value: k,
    label: SPORT_DIVISION_LABELS[k],
  }));

export const SPORT_LABEL = (s: string): string =>
  (SPORT_LABELS as Record<string, string>)[s] ?? s;

export const DIVISION_LABEL = (d: string): string =>
  (SPORT_DIVISION_LABELS as Record<string, string>)[d] ?? d;
