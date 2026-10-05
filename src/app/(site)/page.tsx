import { Hero } from "@/components/sections/hero";
import { ImpactStrip } from "@/components/sections/impact-strip";
import { HomeLazySections } from "@/components/sections/home-lazy-sections";
import {
  getClubs,
  getCouncilPageMembers,
  getEvent,
  getHomepageConfig,
  getSiteSettings,
  getUpcomingEvents,
} from "@/lib/content";
import { isEventPast } from "@/lib/event-status";

// ISR: time-sensitive (event "isLive" / "In N days" / "upcoming" math is
// computed at render). Refresh at most once a minute so the page advances
// without a redeploy.
export const revalidate = 60;

export default async function HomePage() {
  const [upcoming, allClubs, council, homepage, settings] =
    await Promise.all([
      getUpcomingEvents(8),
      getClubs(),
      getCouncilPageMembers(),
      getHomepageConfig(),
      getSiteSettings(),
    ]);

  // Filter clubs to featured set if pinned in CMS
  const clubs =
    homepage.featuredClubSlugs.length > 0
      ? homepage.featuredClubSlugs
          .map((slug) => allClubs.find((c) => c.slug === slug))
          .filter((c): c is NonNullable<typeof c> => Boolean(c))
      : allClubs;
  const configuredFeaturedEvent = homepage.flagshipEventSlug
    ? await getEvent(homepage.flagshipEventSlug)
    : undefined;
  const featuredEvent =
    configuredFeaturedEvent &&
    configuredFeaturedEvent.featured &&
    !isEventPast(configuredFeaturedEvent)
      ? configuredFeaturedEvent
      : upcoming.find((event) => event.featured);

  const impactNumbers = [
    { value: allClubs.length, label: "Student-run clubs" },
    {
      value: 5000,
      suffix: "+",
      displayValue: "5K+",
      label: "Active students",
    },
    { value: council.length || 8, label: "Council members" },
    { value: 100, suffix: "+", label: "Events this year" },
  ];

  return (
    <>
      <Hero data={homepage.hero} campus={settings.campus} />
      <ImpactStrip numbers={impactNumbers} />
      <HomeLazySections
        homepage={homepage}
        upcoming={upcoming}
        featuredEvent={featuredEvent}
        clubs={clubs}
        allClubCount={allClubs.length}
      />
    </>
  );
}
