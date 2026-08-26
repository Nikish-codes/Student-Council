import type { Metadata } from "next";
import { Suspense } from "react";
import { EventsOverture } from "@/components/sections/events-overture";
import { findFeaturedEvent } from "@/lib/event-featured";
import { EventsAlmanac } from "@/components/sections/events-almanac";
import { getEvents } from "@/lib/content";
import { getEventTiming } from "@/lib/event-status";

export const metadata: Metadata = {
  title: "Events Calendar",
  description:
    "Bootcamps, hackathons, cultural nights and sports cups — every event run by the Woxsen Student Council.",
};

// ISR: the now/upcoming/past split depends on the current time.
export const revalidate = 60;

export default async function EventsPage() {
  const all = await getEvents();
  const now = Date.now();

  const live = [];
  const upcoming = [];
  const past = [];
  for (const e of all) {
    const t = getEventTiming(e, now);
    if (t.isPast) past.push(e);
    else if (t.isLive) live.push(e);
    else upcoming.push(e);
  }

  // The large spotlight is editorial, not an automatic promotion. With no
  // explicitly featured upcoming event, the page goes straight to the lists.
  const featured = findFeaturedEvent(upcoming);

  return (
    <div>
      <EventsOverture
        liveCount={live.length}
        upcomingCount={upcoming.length}
        pastCount={past.length}
        featured={featured}
      />
      <Suspense fallback={null}>
        <EventsAlmanac live={live} upcoming={upcoming} past={past} />
      </Suspense>
    </div>
  );
}
