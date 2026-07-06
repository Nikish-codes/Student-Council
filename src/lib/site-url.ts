/**
 * Canonical public base URL + ticket path helpers. Used to build absolute links
 * for QR payloads, share sheets, `.ics` files, and emails. Safe on client and
 * server (reads a NEXT_PUBLIC_* var).
 */

/** Absolute site origin with any trailing slash removed. */
export function siteUrl(): string {
  const u =
    process.env.NEXT_PUBLIC_SITE_URL || "https://woxsenstudentcouncil.com";
  return u.replace(/\/+$/, "");
}

/** Relative path to a ticket page. */
export function ticketPath(code: string): string {
  return `/t/${encodeURIComponent(code)}`;
}

/** Absolute ticket URL (optionally carrying the signed `k` token for scanning). */
export function ticketUrl(code: string, sig?: string): string {
  const base = `${siteUrl()}${ticketPath(code)}`;
  return sig ? `${base}?k=${encodeURIComponent(sig)}` : base;
}
