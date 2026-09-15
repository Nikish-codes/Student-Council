import type { MetadataRoute } from "next";

import {
  getClubs,
  getEvents,
  getSportsLeagues,
  getSportsTournaments,
} from "@/lib/content";

// Matches the canonical URLs hardcoded in page metadata (apex, not www) so
// Google never sees duplicates between sitemap and rel=canonical.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://woxsenstudentcouncil.in";
  const now = new Date();
  const staticPaths = [
    { path: "/", freq: "daily", priority: 1 },
    { path: "/events", freq: "daily", priority: 0.9 },
    { path: "/clubs", freq: "weekly", priority: 0.9 },
    { path: "/clubsignup", freq: "weekly", priority: 0.8 },
    { path: "/council", freq: "monthly", priority: 0.7 },
    { path: "/support", freq: "weekly", priority: 0.7 },
    { path: "/sports", freq: "weekly", priority: 0.6 },
    { path: "/sports/calendar", freq: "daily", priority: 0.5 },
    { path: "/sports/leagues", freq: "weekly", priority: 0.5 },
    { path: "/sports/tournaments", freq: "weekly", priority: 0.5 },
  ] as const;

  const statics: MetadataRoute.Sitemap = staticPaths.map((item) => ({
    url: `${base}${item.path}`,
    lastModified: now,
    changeFrequency: item.freq,
    priority: item.priority,
  }));

  // Detail pages come from content getters. Guarded so a bad DB day never
  // breaks the sitemap route (its absence beats a 500 during indexing).
  let dynamic: MetadataRoute.Sitemap = [];
  try {
    const [events, clubs, leagues, tournaments] = await Promise.all([
      getEvents(),
      getClubs(),
      getSportsLeagues(),
      getSportsTournaments(),
    ]);
    dynamic = [
      ...events.map((event) => ({
        url: `${base}/events/${event.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...clubs.map((club) => ({
        url: `${base}/clubs/${club.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
      ...leagues.map((league) => ({
        url: `${base}/sports/leagues/${league.slug}`,
        changeFrequency: "daily" as const,
        priority: 0.6,
      })),
      ...tournaments.map((tournament) => ({
        url: `${base}/sports/tournaments/${tournament.slug}`,
        changeFrequency: "daily" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // Sitemap still ships everything static; pages recover next cycle.
  }

  return [...statics, ...dynamic];
}
