import { db } from "@/db/client";
import { media } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { CompetitionResult } from "@/lib/sports-results";
import { Picture } from "@/components/ui/picture";

export async function SportsCompetitionResult({
  result,
}: {
  result?: CompetitionResult | null;
}) {
  if (
    !result ||
    (!result.winnerName &&
      !result.summary &&
      !result.photoId &&
      !result.runnerUpName)
  )
    return null;
  const photo = result.photoId
    ? await db.query.media.findFirst({ where: eq(media.id, result.photoId) })
    : null;
  return (
    <section className="container mb-16">
      <div className="grid items-start gap-8 border-y border-line/10 py-8 md:grid-cols-2">
        <div>
          <h2 className="display text-3xl sm:text-4xl">Competition result</h2>
          {result.winnerName && (
            <div className="mt-6">
              <p className="text-sm text-muted">Winner</p>
              <p className="mt-1 break-words text-2xl font-semibold text-accent sm:text-3xl">
                {result.winnerName}
              </p>
            </div>
          )}
          {result.runnerUpName && (
            <p className="mt-4 text-base text-muted">
              Runner-up: <span className="text-ink">{result.runnerUpName}</span>
            </p>
          )}
          {result.summary && (
            <p className="mt-6 max-w-prose whitespace-pre-line text-base leading-relaxed text-muted">
              {result.summary}
            </p>
          )}
        </div>
        {photo && (
          <Picture
            src={photo.url}
            alt={
              result.winnerName
                ? `${result.winnerName} — competition winner`
                : "Competition result"
            }
            width={photo.width || 1200}
            height={photo.height || 800}
            className="h-auto w-full rounded-xl object-contain"
          />
        )}
      </div>
    </section>
  );
}
