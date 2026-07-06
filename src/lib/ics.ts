/**
 * Minimal iCalendar (.ics) generator for a single event ticket. No dependency —
 * produces a VEVENT with CRLF line endings, UTC timestamps, and escaped text so
 * students can add the event (with a link back to their ticket) to any calendar.
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Date → `YYYYMMDDTHHMMSSZ` (UTC). */
function toUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Escape per RFC 5545 (commas, semicolons, backslashes, newlines). */
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export type IcsInput = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end?: Date;
  url?: string;
};

export function buildIcs(input: IcsInput): string {
  const now = new Date();
  const end = input.end ?? new Date(input.start.getTime() + 2 * 60 * 60 * 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Woxsen Student Council//Tickets//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${esc(input.uid)}`,
    `DTSTAMP:${toUtc(now)}`,
    `DTSTART:${toUtc(input.start)}`,
    `DTEND:${toUtc(end)}`,
    `SUMMARY:${esc(input.title)}`,
    input.location ? `LOCATION:${esc(input.location)}` : null,
    input.description ? `DESCRIPTION:${esc(input.description)}` : null,
    input.url ? `URL:${esc(input.url)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);
  return lines.join("\r\n") + "\r\n";
}
