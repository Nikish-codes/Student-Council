import type { Metadata } from "next";
import Link from "next/link";
import { EventsOverture } from "@/components/sections/events-overture";
import { EventsAlmanac } from "@/components/sections/events-almanac";
import { EventsRecap } from "@/components/sections/events-recap";
import { getEvents } from "@/lib/content";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Bootcamps, hackathons, cultural nights and sports cups — every event run by the Woxsen Student Council.",
};

export default async function EventsPage() {
  const all = await getEvents();
  const now = Date.now();
  const sevenDays = 7 * 86_400_000;

  const upcoming = all.filter((e) => {
    const end = e.endDate ? +new Date(e.endDate) : +new Date(e.date) + 86_400_000;
    return end >= now;
  });
  const past = all.filter((e) => {
    const end = e.endDate ? +new Date(e.endDate) : +new Date(e.date) + 86_400_000;
    return end < now;
  });

  const next = upcoming[0];
  const featured = upcoming.find((e) => e.featured) ?? next;
  const thisWeekCount = upcoming.filter(
    (e) => +new Date(e.date) - now <= sevenDays && +new Date(e.date) >= now,
  ).length;

  return (
    <div>
      <EventsOverture
        total={upcoming.length}
        thisWeekCount={thisWeekCount}
        next={next}
        featured={featured}
      />
      <EventsAlmanac events={upcoming} />
      <EventsRecap />
      {past.length > 0 && (
        <section className="border-t border-line/8 bg-bg">
          <div className="mx-auto max-w-[1720px] px-6 lg:px-10 py-16 lg:py-24 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
            <div>
              <div className="kicker mb-4 text-muted">Looking back?</div>
              <p className="text-ink text-xl sm:text-2xl max-w-2xl leading-snug">
                <span className="display italic text-ink">{String(past.length).padStart(2, "0")}</span>{" "}
                events already shipped. Browse the full archive.
              </p>
            </div>
            <Link
              href="/archive"
              className="inline-flex items-center gap-3 text-sm font-mono uppercase tracking-[0.2em] text-ink border-b border-ink/40 pb-1 hover:border-ink transition-colors self-start sm:self-auto"
            >
              Open the archive
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
