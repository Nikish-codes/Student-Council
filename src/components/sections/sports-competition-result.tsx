import Image from "next/image";
import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { media } from "@/db/schema";
import type { CompetitionResult } from "@/lib/sports-results";
import { SportsCompetitionGallery } from "./sports-competition-gallery";

export async function SportsCompetitionResult({
  result,
  competitionTitle,
}: {
  result?: CompetitionResult | null;
  competitionTitle?: string;
}) {
  if (!result) return null;

  const hasPodium = Boolean(
    result.winnerName ||
      result.runnerUpName ||
      result.summary ||
      result.photoId ||
      result.runnerUpPhotoId,
  );
  const awards = Array.isArray(result.awards)
    ? result.awards.filter((a) => a && (a.title || a.recipient))
    : [];
  const galleryIds = Array.isArray(result.galleryImageIds)
    ? result.galleryImageIds.filter(Boolean)
    : [];

  if (!hasPodium && awards.length === 0 && galleryIds.length === 0) {
    return null;
  }

  // Collect all media IDs to fetch in a single query
  const mediaIds = new Set<number>();
  if (result.photoId) mediaIds.add(result.photoId);
  if (result.runnerUpPhotoId) mediaIds.add(result.runnerUpPhotoId);
  for (const a of awards) {
    if (a.photoId) mediaIds.add(a.photoId);
  }
  for (const gid of galleryIds) {
    mediaIds.add(gid);
  }

  const mediaList =
    mediaIds.size > 0
      ? await db
          .select({
            id: media.id,
            url: media.url,
            width: media.width,
            height: media.height,
            alt: media.alt,
          })
          .from(media)
          .where(inArray(media.id, Array.from(mediaIds)))
      : [];

  const mediaMap = new Map(mediaList.map((m) => [m.id, m]));

  const winnerPhoto = result.photoId ? mediaMap.get(result.photoId) : null;
  const runnerUpPhoto = result.runnerUpPhotoId
    ? mediaMap.get(result.runnerUpPhotoId)
    : null;
  const galleryImages = galleryIds
    .map((id) => mediaMap.get(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  return (
    <div className="container space-y-16 pb-16">
      {/* ─── Podium & Result Section ─── */}
      {hasPodium && (
        <section aria-labelledby="podium-heading">
          <div className="mb-8 border-b border-line/10 pb-4">
            <span className="kicker text-accent">Competition Outcome</span>
            <h2 id="podium-heading" className="display mt-1 text-3xl sm:text-4xl">
              Results & Podium
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Champion Card */}
            {result.winnerName && (
              <div className="group relative overflow-hidden rounded-2xl border border-amber-500/30 bg-surface/50 p-6 sm:p-8 transition-colors hover:border-amber-500/50">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-amber-300">
                  <span>🏆</span>
                  <span>Champions</span>
                </div>
                <h3 className="display text-3xl text-ink sm:text-4xl">
                  {result.winnerName}
                </h3>

                {winnerPhoto && (
                  <div className="relative mt-6 aspect-[16/10] w-full overflow-hidden rounded-xl border border-line/15 bg-surface-2 flex items-center justify-center">
                    <Image
                      src={winnerPhoto.url}
                      alt=""
                      fill
                      className="scale-125 object-cover opacity-20 blur-xl pointer-events-none"
                    />
                    <Image
                      src={winnerPhoto.url}
                      alt={`${result.winnerName} — Champion`}
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-contain p-2"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Runner-up Card */}
            {(result.runnerUpName || runnerUpPhoto) && (
              <div className="group relative overflow-hidden rounded-2xl border border-slate-400/25 bg-surface/40 p-6 sm:p-8 transition-colors hover:border-slate-400/40">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-400/30 bg-slate-400/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-slate-300">
                  <span>🥈</span>
                  <span>Runner-up</span>
                </div>
                {result.runnerUpName && (
                  <h3 className="display text-3xl text-ink sm:text-4xl">
                    {result.runnerUpName}
                  </h3>
                )}

                {runnerUpPhoto && (
                  <div className="relative mt-6 aspect-[16/10] w-full overflow-hidden rounded-xl border border-line/15 bg-surface-2 flex items-center justify-center">
                    <Image
                      src={runnerUpPhoto.url}
                      alt=""
                      fill
                      className="scale-125 object-cover opacity-20 blur-xl pointer-events-none"
                    />
                    <Image
                      src={runnerUpPhoto.url}
                      alt={`${result.runnerUpName || "Runner-up"}`}
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-contain p-2"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {result.summary && (
            <div className="mt-8 rounded-2xl border border-line/10 bg-surface/30 p-6 sm:p-8">
              <span className="kicker text-subtle">Recap & Details</span>
              <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-muted">
                {result.summary}
              </p>
            </div>
          )}
        </section>
      )}

      {/* ─── Individual Category Awards / MVP Section ─── */}
      {awards.length > 0 && (
        <section aria-labelledby="awards-heading">
          <div className="mb-8 border-b border-line/10 pb-4">
            <span className="kicker text-accent">Individual Accolades</span>
            <h2 id="awards-heading" className="display mt-1 text-3xl sm:text-4xl">
              Honours & Awards
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {awards.map((award, i) => {
              const photo = award.photoId ? mediaMap.get(award.photoId) : null;

              return (
                <div
                  key={award.id || i}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line/15 bg-surface/40 p-5 transition-all duration-300 hover:border-line/30 hover:bg-surface/60"
                >
                  <div>
                    {/* Award category badge */}
                    <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-accent">
                      <span>⭐</span>
                      <span>{award.title}</span>
                    </div>

                    {/* Award photo */}
                    {photo ? (
                      <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-xl border border-line/10 bg-surface-2 flex items-center justify-center">
                        <Image
                          src={photo.url}
                          alt=""
                          fill
                          className="scale-125 object-cover opacity-20 blur-xl pointer-events-none"
                        />
                        <Image
                          src={photo.url}
                          alt={award.recipient}
                          fill
                          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
                          className="object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="relative mb-4 grid aspect-square w-full place-items-center rounded-xl border border-line/10 bg-surface-2/60 font-mono text-3xl text-subtle">
                        <span>{award.recipient.charAt(0).toUpperCase()}</span>
                      </div>
                    )}

                    <h4 className="display text-xl text-ink">
                      {award.recipient}
                    </h4>
                  </div>

                  {award.team ? (
                    <div className="mt-3 border-t border-line/10 pt-2.5">
                      <span className="font-mono text-xs uppercase tracking-wider text-subtle">
                        {award.team}
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── League Photo Gallery ─── */}
      {galleryImages.length > 0 && (
        <SportsCompetitionGallery
          images={galleryImages}
          title={competitionTitle ? `${competitionTitle} Gallery` : "League Gallery"}
        />
      )}
    </div>
  );
}
