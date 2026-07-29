import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Deep-link to Outlook on the web with a new message pre-addressed to someone.
 * Council inboxes are Office 365, so this lands in the right client instead of
 * whatever `mailto:` happens to be registered on the visitor's machine.
 *
 * `encodeURIComponent` matters here: address-legal characters like `+` would
 * otherwise decode to a space on Outlook's side and silently break the To field.
 */
export function outlookCompose(email: string) {
  return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(
    email.trim(),
  )}`;
}

const NUMBER_WORDS = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
  "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
  "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty",
];

/**
 * Spell a small count for editorial copy ("Eight people. One council.") so the
 * headline can follow the data instead of hard-coding a number that goes stale
 * the moment someone joins. Falls back to digits past twenty.
 */
export function numberWord(n: number) {
  return NUMBER_WORDS[n] ?? String(n);
}

export function shortDate(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  return {
    day: d.toLocaleDateString("en-IN", { day: "2-digit" }),
    month: d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
    year: d.getFullYear().toString(),
  };
}
