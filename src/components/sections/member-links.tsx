import { Mail } from "lucide-react";
import { cn, outlookCompose } from "@/lib/utils";
import type { CouncilMember } from "@/lib/schemas";

/**
 * The Outlook + LinkedIn button pair shown on every council member, at both the
 * president's size (`lg`) and the card size (`sm`). Extracted because this row
 * was previously copy-pasted per layout and the two drifted apart.
 *
 * Either button is omitted entirely when the member has no such address — an
 * icon that opens a blank compose window is worse than no icon.
 */
export function MemberLinks({
  member,
  size = "sm",
  className,
}: {
  member: Pick<CouncilMember, "name" | "email" | "linkedin">;
  size?: "sm" | "lg";
  className?: string;
}) {
  const { name, email, linkedin } = member;
  if (!email && !linkedin) return null;

  const btn = cn(
    "grid place-items-center rounded-full border border-line/15 text-muted",
    "transition-colors hover:border-line/40 hover:text-ink",
    size === "lg" ? "h-10 w-10" : "h-8 w-8",
  );
  const glyph = size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {email && (
        <a
          href={outlookCompose(email)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Email ${name} on Outlook`}
          title={email}
          className={btn}
        >
          <Mail className={glyph} />
        </a>
      )}
      {linkedin && (
        <a
          href={linkedin}
          target="_blank"
          rel="noreferrer"
          aria-label={`${name} on LinkedIn`}
          className={btn}
        >
          <LinkedInMark className={glyph} />
        </a>
      )}
    </div>
  );
}

/**
 * Inline LinkedIn mark — lucide v1 dropped brand icons, and the generic
 * external-link arrow this replaces gave no hint where the link actually went.
 */
function LinkedInMark({ className }: { className?: string }) {
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
