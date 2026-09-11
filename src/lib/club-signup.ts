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
