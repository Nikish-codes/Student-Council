import "server-only";
import crypto from "node:crypto";

/**
 * Ticket QR signing (anti-forgery). The QR carries a URL of the form
 *   {SITE_URL}/t/{ticketCode}?k={sig}
 * where `sig = HMAC_SHA256(ticketCode, TICKET_SECRET)` truncated to 16 base64url
 * chars. A forged/altered code fails signature verification without touching the
 * DB. Single-use enforcement (first-scan-wins) still happens at check-in — the
 * signature is defence-in-depth, not the only gate.
 *
 * Manually typed codes (trusted staff at the check-in box) are allowed without a
 * signature: the DB lookup + single-use update still gate them.
 */

function secret(): string {
  const s = process.env.TICKET_SECRET || process.env.AUTH_SECRET;
  if (!s) throw new Error("TICKET_SECRET (or AUTH_SECRET) is not set");
  return s;
}

const SIG_LEN = 16;

/** Compute the signature for a ticket code. */
export function signTicket(code: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(code)
    .digest("base64url")
    .slice(0, SIG_LEN);
}

/** The compact token embedded/scanned as `CODE.SIG`. */
export function ticketToken(code: string): string {
  return `${code}.${signTicket(code)}`;
}

type Parsed = { code: string; sig: string | null };

/**
 * Normalise whatever the scanner produced into `{ code, sig }`. Accepts:
 *  - a full ticket URL:      https://host/t/WSC-ABCD-EFGH?k=sig
 *  - a compact token:        WSC-ABCD-EFGH.sig
 *  - a bare code (typed in):  WSC-ABCD-EFGH
 * The code is upper-cased (codes are uppercase); the signature is left verbatim
 * (base64url is case-sensitive).
 */
export function parseScan(input: string): Parsed | null {
  const raw = input.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const m = u.pathname.match(/\/t\/([^/]+)\/?$/);
      if (!m) return null;
      return {
        code: decodeURIComponent(m[1]).toUpperCase(),
        sig: u.searchParams.get("k"),
      };
    } catch {
      return null;
    }
  }

  const dot = raw.lastIndexOf(".");
  if (dot > 0) {
    return { code: raw.slice(0, dot).toUpperCase(), sig: raw.slice(dot + 1) };
  }
  return { code: raw.toUpperCase(), sig: null };
}

function timingSafeStrEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/**
 * Verify a scanned string and return the canonical ticket code, or null.
 * A present-but-invalid signature is rejected. A missing signature (typed code)
 * is accepted — the caller still gates it against the DB.
 */
export function verifyScan(input: string): string | null {
  const parsed = parseScan(input);
  if (!parsed) return null;
  if (parsed.sig != null) {
    return timingSafeStrEqual(parsed.sig, signTicket(parsed.code))
      ? parsed.code
      : null;
  }
  return parsed.code;
}
