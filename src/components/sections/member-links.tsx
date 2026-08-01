import { Mail } from "lucide-react";
import { LinkedInMark } from "@/components/ui/brand-marks";
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
    size === "lg" ? "h-12 w-12" : "h-10 w-10",
  );
  const glyph = size === "lg" ? "h-6 w-6" : "h-5 w-5";

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
