/**
 * Per-club accent colour.
 *
 * This value is authored in the management panel and ends up inside a `style`
 * attribute as a CSS custom property. An unvalidated string there is a CSS
 * injection vector — `red; background: url(https://evil/)` would break out of
 * the declaration. So the ONLY accepted shape is a 6-digit hex, checked on the
 * way in (the server action) AND on the way out (the read path), because rows
 * written before this validation existed can still be sitting in the database.
 */

const HEX = /^#[0-9a-f]{6}$/i;

/** Normalise to `#rrggbb`, or undefined if it isn't a plain 6-digit hex. */
export function normalizeAccent(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return HEX.test(trimmed) ? trimmed.toLowerCase() : undefined;
}

/**
 * `#rrggbb` → `r g b` for Tailwind's `rgb(var(--x) / <alpha>)` token pattern,
 * which is how every colour in globals.css is expressed. Returning the triple
 * (not a hex) is what lets the club accent be used at partial opacity.
 */
export function accentChannels(value?: string | null): string | undefined {
  const hex = normalizeAccent(value);
  if (!hex) return undefined;
  const n = Number.parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}
