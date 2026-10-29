export const OVAL_TIMEZONE = "Asia/Kolkata";
export const OVAL_RELEASE_HOUR = 4;

export function dateParts(date: Date, timeZone = OVAL_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

export function isoFromParts(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/** The campus service day changes at 04:00 Asia/Kolkata, not at midnight. */
export function getOvalServiceDate(now = new Date()): string {
  const shifted = new Date(now.getTime() - OVAL_RELEASE_HOUR * 60 * 60 * 1000);
  return isoFromParts(dateParts(shifted));
}

export function getKolkataMinutes(now = new Date()): number {
  const parts = dateParts(now);
  return parts.hour * 60 + parts.minute;
}
