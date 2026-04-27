import { Hero } from "@/components/sections/hero";
import { AnnouncementsTicker } from "@/components/sections/announcements-ticker";
import { StatsSymphony } from "@/components/sections/stats-symphony";
import { HomeVault } from "@/components/sections/home-vault";
import { HomeFeaturedEvent } from "@/components/sections/home-featured-event";
import { HomeUpcomingStrip } from "@/components/sections/home-upcoming-strip";
import { ManifestoKinetic } from "@/components/sections/manifesto-kinetic";
import { ClubsLogoWall } from "@/components/sections/clubs-logo-wall";
import { ClosingCTA } from "@/components/sections/closing-cta";
import {
  getClubs,
  getEvent,
  getHomepageConfig,
  getSiteSettings,
  getUpcomingEvents,
} from "@/lib/content";

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
      <HomeVault entries={homepage.vaultStories} />
      <HomeFeaturedEvent event={featuredEvent} />
      <HomeUpcomingStrip events={upcoming} totalCount={upcoming.length} />
      <StatsSymphony kicker={homepage.statsKicker} stats={homepage.stats} />
      <ManifestoKinetic
        kicker={homepage.manifestoKicker}
        lines={homepage.manifestoLines}
        footer={homepage.manifestoFooter}
      />
      <ClubsLogoWall clubs={clubs} />
      <ClosingCTA data={homepage.closingCta} />
    </>
  );
}
