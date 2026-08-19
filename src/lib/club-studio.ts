import "server-only";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { clubs } from "@/db/schema";
import { getUserClubMemberships } from "@/lib/club-access";
import { requireUser } from "@/lib/rbac";

export type StudioMembership = {
  id: string;
  clubId: number;
  clubName: string;
  clubSlug: string;
  membershipRole: "president" | "member";
  canEditPage: boolean;
  canManageEvents: boolean;
  canManageMedia: boolean;
};

export async function getStudioMemberships(): Promise<StudioMembership[]> {
  const user = await requireUser();
  const rows = await getUserClubMemberships(Number(user.id));
  if (rows.length > 0) {
    return rows.map((row) => ({
      id: row.id,
      clubId: row.clubId,
      clubName: row.club.name,
      clubSlug: row.club.slug,
      membershipRole: row.membershipRole,
      canEditPage: row.canEditPage,
      canManageEvents: row.canManageEvents,
      canManageMedia: row.canManageMedia,
    }));
  }
  if (user.role === "club_lead" && user.clubId) {
    const club = await db.query.clubs.findFirst({
      where: eq(clubs.id, user.clubId),
    });
    if (club) {
      return [{
        id: `legacy-${user.id}-${club.id}`,
        clubId: club.id,
        clubName: club.name,
        clubSlug: club.slug,
        membershipRole: "president",
        canEditPage: true,
        canManageEvents: true,
        canManageMedia: true,
      }];
    }
  }
  return [];
}

export async function requireStudioClub(requestedClub?: string | string[]) {
  const memberships = await getStudioMemberships();
  if (memberships.length === 0) redirect("/management/login");
  const clubId = Number(Array.isArray(requestedClub) ? requestedClub[0] : requestedClub);
  return memberships.find((item) => item.clubId === clubId) ?? memberships[0];
}
