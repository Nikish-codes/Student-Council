import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { clubs, councilMembers } from "@/db/schema";
import { hasAccessibleClubTheme } from "@/lib/club-page-theme";
import { clubPageSnapshotSchema, type ClubPageSnapshot } from "@/lib/revisions";

const STAGE_THEME = {
  background: "#0b0705",
  foreground: "#fff5e9",
  accent: "#ff5a1f",
  logoTreatment: "natural" as const,
};

/** Build the complete approved snapshot used as the base for Members drafts. */
export async function buildApprovedClubPageSnapshot(
  clubId: number,
): Promise<ClubPageSnapshot> {
  const [club, people] = await Promise.all([
    db.query.clubs.findFirst({ where: eq(clubs.id, clubId) }),
    db.query.councilMembers.findMany({
      where: eq(councilMembers.clubId, clubId),
      orderBy: [asc(councilMembers.sortOrder), asc(councilMembers.id)],
    }),
  ]);
  if (!club) throw new Error("NOT_FOUND");

  const proposedTheme = {
    ...STAGE_THEME,
    accent: club.pageTheme?.accent ?? STAGE_THEME.accent,
  };
  const pageTheme = hasAccessibleClubTheme(proposedTheme)
    ? proposedTheme
    : STAGE_THEME;

  return clubPageSnapshotSchema.parse({
    name: club.name,
    blurb: club.blurb,
    tagline: club.tagline,
    about: club.about,
    logoId: club.logoId,
    coverId: club.coverId,
    joinUrl: club.joinUrl,
    members: club.members,
    foundedYear: club.foundedYear,
    flagshipEvent: club.flagshipEvent,
    activities: club.activities ?? [],
    videos: club.videos ?? [],
    gallery: club.gallery ?? [],
    instagramUrl: club.instagramUrl,
    linkedinUrl: club.linkedinUrl,
    websiteUrl: club.websiteUrl,
    contactEmail: club.contactEmail,
    pageTemplate: "stage",
    pageTheme,
    pageVisibleSections: club.pageVisibleSections ?? [
      "about",
      "activities",
      "videos",
      "events",
      "gallery",
      "people",
    ],
    pageSectionHeadings: club.pageSectionHeadings ?? {},
    pageTypography: "friendly",
    people: people.map((person) => ({
      id: person.id,
      name: person.name,
      role: person.role,
      program: person.program,
      photoId: person.photoId,
      email: person.email,
      linkedin: person.linkedin,
      quote: person.quote,
      bio: person.bio,
      sortOrder: person.sortOrder,
    })),
  });
}
