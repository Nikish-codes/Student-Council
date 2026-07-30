import { Picture } from "@/components/ui/picture";
import { Reveal } from "@/components/motion/reveal";

export function CouncilGroupPhoto({
  photoSrc,
  memberCount,
}: {
  photoSrc?: string;
  memberCount: number;
}) {
  const hasPhoto = Boolean(photoSrc);

  return (
    <section
      className="container mt-20 sm:mt-28"
      aria-label="Council group portrait"
    >
      <Reveal>
        <figure>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line/10 bg-surface-2 sm:aspect-video lg:aspect-[21/9]">
            {hasPhoto ? (
              <Picture
                src={photoSrc!}
                alt="Woxsen Student Council 2026/27 group portrait"
                fill
                sizes="(min-width: 1536px) 1560px, (min-width: 1024px) calc(100vw - 6rem), calc(100vw - 2.5rem)"
                quality={88}
                className="object-cover grayscale-[15%]"
              />
            ) : (
              <div
                role="img"
                aria-label="Reserved space for the Woxsen Student Council 2026/27 group portrait"
                className="absolute inset-0 grid place-items-center overflow-hidden"
              >
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, rgb(var(--line) / 0.22) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                  }}
                />
                <span
                  aria-hidden
                  className="absolute bottom-[-0.12em] left-1/2 -translate-x-1/2 whitespace-nowrap font-display text-[clamp(5rem,18vw,18rem)] italic leading-none text-ink/[0.035]"
                >
                  Together.
                </span>
                <div className="relative max-w-3xl px-8 text-center">
                  <p className="kicker text-ink/65">Council group portrait</p>
                  <h2 className="display mt-5 text-balance text-4xl leading-[0.95] text-ink sm:text-6xl">
                    One council. One frame.
                  </h2>
                </div>
              </div>
            )}

            {hasPhoto && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-bg/20"
              />
            )}

            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 sm:p-8">
              <div className="flex items-center justify-between gap-5">
                <span className="kicker text-ink">Full council</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/65">
                  Session 2026/27
                </span>
              </div>
              <div className="flex items-end justify-between gap-5">
                <span className="h-px w-14 bg-line/40" aria-hidden />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/65">
                  {memberCount} voices
                </span>
              </div>
            </div>
          </div>

          <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>Woxsen Student Council</span>
            <span>Hyderabad · 2026/27</span>
          </figcaption>
        </figure>
      </Reveal>
    </section>
  );
}
