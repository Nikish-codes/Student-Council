const CAMPUS_TIME_ZONE = "Asia/Kolkata";

/**
 * Match dates come from a `datetime-local` management field. Values without an
 * explicit offset are campus-local times, so make that timezone explicit
 * before formatting them on a server that may be running in UTC.
 */
export function parseSportsMatchDate(value?: string): Date | undefined {
  if (!value) return undefined;

  let normalized = value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    normalized = `${normalized}T00:00:00+05:30`;
  } else if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)) {
    normalized = `${normalized}${normalized.length === 16 ? ":00" : ""}+05:30`;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function getSportsMatchYear(value?: string): number | undefined {
  const date = parseSportsMatchDate(value);
  if (!date) return undefined;
  return Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: CAMPUS_TIME_ZONE,
    }).format(date),
  );
}

export function formatSportsMatchDate(value?: string): string {
  const date = parseSportsMatchDate(value);
  if (!date) return "Date to be announced";
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: CAMPUS_TIME_ZONE,
  }).format(date);
}

export function formatSportsMatchTime(value?: string): string | undefined {
  const date = parseSportsMatchDate(value);
  if (!date) return undefined;
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: CAMPUS_TIME_ZONE,
  }).format(date);
}

export function getSportsMatchMonthKey(value?: string): string | undefined {
  const date = parseSportsMatchDate(value);
  if (!date) return undefined;
  const parts = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "2-digit",
    timeZone: CAMPUS_TIME_ZONE,
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : undefined;
}

export function formatSportsMatchMonth(value?: string): string {
  const date = parseSportsMatchDate(value);
  if (!date) return "Date to be announced";
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: CAMPUS_TIME_ZONE,
  }).format(date);
}
