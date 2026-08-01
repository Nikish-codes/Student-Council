/**
 * Inline brand glyphs. lucide v1 dropped brand icons, and a generic
 * external-link arrow gives no hint where a link actually goes — so the two
 * marks the site links out to are drawn here.
 *
 * The LinkedIn mark started out private inside `sections/member-links.tsx`;
 * it moved here when the club page needed the same glyph, so there is one copy
 * rather than two that drift.
 */

type MarkProps = { className?: string };

export function LinkedInMark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.65h.05A4.17 4.17 0 0 1 17.6 8.7c3.7 0 4.4 2.4 4.4 5.55V21h-4v-5.6c0-1.34-.03-3.06-1.9-3.06-1.9 0-2.2 1.46-2.2 2.96V21h-4V9Z" />
    </svg>
  );
}

export function InstagramMark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
