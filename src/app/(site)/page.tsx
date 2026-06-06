import { Hero } from "@/components/sections/hero";
import { AnnouncementsTicker } from "@/components/sections/announcements-ticker";
import { HomeLazySections } from "@/components/sections/home-lazy-sections";
import {
  getClubs,
  getEvent,
  getHomepageConfig,
  getSiteSettings,
  getUpcomingEvents,
} from "@/lib/content";

// ISR: time-sensitive (event "isLive" / "In N days" / "upcoming" math is
// computed at render). Refresh at most once a minute so the page advances
// without a redeploy.
export const revalidate = 60;

export default async function HomePage() {
  const [upcoming, allClubs, homepage, settings] = await Promise.all([
    getUpcomingEvents(8),
    getClubs(),
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
  const featuredEvent = homepage.flagshipEventSlug
    ? await getEvent(homepage.flagshipEventSlug)
    : upcoming.find((event) => event.featured);

  return (
    <>
      <Hero data={homepage.hero} campus={settings.campus} />
      <AnnouncementsTicker />
      <HomeLazySections
        homepage={homepage}
        upcoming={upcoming}
        featuredEvent={featuredEvent}
        clubs={clubs}
      />
    </>
  );
}
