"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { Club, EventItem, HomepageConfigData } from "@/lib/schemas";

const HomeVault = dynamic(
  () => import("@/components/sections/home-vault").then((mod) => mod.HomeVault),
  { ssr: false },
);

const HomeFeaturedEvent = dynamic(
  () => import("@/components/sections/home-featured-event").then((mod) => mod.HomeFeaturedEvent),
  { ssr: false },
);

const HomeUpcomingStrip = dynamic(
  () => import("@/components/sections/home-upcoming-strip").then((mod) => mod.HomeUpcomingStrip),
  { ssr: false },
);

const ManifestoKinetic = dynamic(
  () => import("@/components/sections/manifesto-kinetic").then((mod) => mod.ManifestoKinetic),
  { ssr: false },
);

const ClubsLogoWall = dynamic(
  () => import("@/components/sections/clubs-logo-wall").then((mod) => mod.ClubsLogoWall),
  { ssr: false },
);

const ClosingCTA = dynamic(
  () => import("@/components/sections/closing-cta").then((mod) => mod.ClosingCTA),
  { ssr: false },
);

type HomeLazySectionsProps = {
  homepage: HomepageConfigData;
  upcoming: EventItem[];
  featuredEvent?: EventItem;
  clubs: Club[];
};

export function HomeLazySections({
  homepage,
  upcoming,
  featuredEvent,
  clubs,
}: HomeLazySectionsProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    if (shouldLoad) return;
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "900px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={rootRef}>
      {shouldLoad ? (
        <>
          <HomeVault entries={homepage.vaultStories} />
          <HomeFeaturedEvent event={featuredEvent} />
          <HomeUpcomingStrip events={upcoming} totalCount={upcoming.length} />
          <ManifestoKinetic
            kicker={homepage.manifestoKicker}
            lines={homepage.manifestoLines}
            footer={homepage.manifestoFooter}
          />
          <ClubsLogoWall clubs={clubs} />
          <ClosingCTA data={homepage.closingCta} />
        </>
      ) : (
        <div className="min-h-[45vh] border-y border-line/10 bg-bg" aria-hidden />
      )}
    </div>
  );
}