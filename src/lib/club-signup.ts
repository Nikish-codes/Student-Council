export function registrationLink(value?: string | null): string | undefined {
  if (!value || /example[-/]/i.test(value)) return undefined;
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export const signupSearchText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function matchesClubSearch(
  club: { name: string; slug: string; blurb: string; tags: string[] },
  query: string,
) {
  const text = signupSearchText(
    [club.name, club.slug, club.blurb, ...club.tags].join(" "),
  );
  return signupSearchText(query)
    .split(" ")
    .filter(Boolean)
    .every((word) => text.includes(word));
}

export const CLUB_APPLY_LIMIT = 3;
export const CLUB_APPLY_STORAGE_KEY = "clubsignup:applies:v1";
export const CLUB_APPLY_CONFIRM_KEY = "clubsignup:confirm-opened:v1";

export type ClubApplyEntry = { slug: string; name: string; at: number };

export function parseClubApplies(raw: unknown): ClubApplyEntry[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const entries: ClubApplyEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const slug = typeof record.slug === "string" ? record.slug.trim() : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!slug || !name || seen.has(slug)) continue;
    seen.add(slug);
    entries.push({
      slug,
      name,
      at: typeof record.at === "number" ? record.at : 0,
    });
  }
  return entries.slice(0, CLUB_APPLY_LIMIT);
}

export type ClubApplyState = "open" | "applied" | "blocked";

export function clubApplyState(
  applies: readonly ClubApplyEntry[],
  slug: string,
): ClubApplyState {
  return applies.some((entry) => entry.slug === slug)
    ? "applied"
    : applies.length >= CLUB_APPLY_LIMIT
      ? "blocked"
      : "open";
}
