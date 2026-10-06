import type { Metadata } from "next";
import Link from "next/link";
import { Picture } from "@/components/ui/picture";
import { getSportsLeagues } from "@/lib/content";
import { SPORT_LABELS, SPORT_DIVISION_LABELS, type SportType } from "@/lib/schemas";

export const metadata: Metadata = {
  title: "Sports Leagues",
  description: "All Woxsen Sports Academy leagues — multi-round competitions with standings.",
};

export const revalidate = 60;

export default async function LeaguesPage() {
  const leagues = await getSportsLeagues();
  const years = Array.from(new Set(leagues.map((l) => l.year))).sort(
    (a, b) => b - a,
  );

  return (
    <div className="container pt-32 sm:pt-40">
      <div className="mb-12 border-b border-line/10 pb-10">
        <span className="kicker">Sports</span>
        <h1 className="display mt-4 text-5xl sm:text-7xl">Leagues</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Multi-round competitions — multiple chances, one table.
        </p>
      </div>

      {leagues.length === 0 ? (
        <div className="border-y border-line/10 py-32 text-center">
          <p className="display text-2xl text-muted">No leagues yet.</p>
        </div>
      ) : (
        <div className="space-y-16 pb-32">
          {years.map((year) => {
            const yearLeagues = leagues.filter((l) => l.year === year);
            return (
              <section key={year}>
                <div className="mb-6 flex items-baseline gap-4">
                  <h2 className="display italic text-4xl text-ink sm:text-5xl">
                    {year}
                  </h2>
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-subtle">
                    {yearLeagues.length} league
                    {yearLeagues.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {yearLeagues.map((l) => (
                    <Link
                      key={l.id}
                      href={`/sports/leagues/${l.slug}`}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line/10 bg-surface/40 transition-all duration-500 hover:border-line/30 hover:bg-surface/60"
                    >
                      <div className="relative aspect-[16/11] sm:aspect-[16/10] w-full overflow-hidden flex items-center justify-center bg-surface-2/60 border-b border-line/5">
                        {/* Ambient backdrop glow for 9:16 portrait posters */}
                        <Picture
                          src={l.banner}
                          alt=""
                          fill
                          sizes="10vw"
                          fallbackLabel=""
                          className="scale-125 object-cover opacity-30 blur-xl pointer-events-none"
                        />
                        <Picture
                          src={l.banner}
                          alt={l.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          fallbackLabel={SPORT_LABELS[l.sport as SportType] ?? l.sport}
                          className="object-contain p-2 transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                        />
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <span className="kicker text-accent">
                          {SPORT_LABELS[l.sport as SportType] ?? l.sport}
                          {l.division !== "open" &&
                            ` · ${SPORT_DIVISION_LABELS[l.division]}`}
                        </span>
                        <h3 className="display mt-1.5 text-2xl text-ink group-hover:text-accent transition-colors">
                          {l.title}
                        </h3>
                        {l.excerpt && (
                          <p className="mt-2 text-sm text-muted line-clamp-2">{l.excerpt}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
