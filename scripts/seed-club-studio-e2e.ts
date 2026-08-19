import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";

import { db } from "../src/db/client";
import { clubMemberships, clubs, events, users, type UserRole } from "../src/db/schema";

const url = process.env.LIBSQL_URL ?? "";
if (!url.startsWith("file:") || !url.includes("club-studio-e2e")) {
  throw new Error(
    "Refusing to seed: LIBSQL_URL must be a local file containing club-studio-e2e.",
  );
}

const password = "ClubStudio!2026";
let passwordHash = "";

async function upsertUser(email: string, name: string, role: UserRole) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    await db
      .update(users)
      .set({ name, role, password: passwordHash, mustChangePassword: false })
      .where(eq(users.id, existing.id));
    return existing.id;
  }
  const [created] = await db
    .insert(users)
    .values({ name, email, role, password: passwordHash })
    .returning({ id: users.id });
  return created.id;
}

async function upsertClub(name: string, slug: string) {
  const existing = await db.query.clubs.findFirst({ where: eq(clubs.slug, slug) });
  if (existing) return existing.id;
  const [created] = await db
    .insert(clubs)
    .values({
      name,
      slug,
      blurb: "A browser-test club for the complete Club Studio workflow.",
      tagline: "Create, gather, publish.",
      about: "This local fixture exercises Club Studio without touching production data.",
      activities: [{ title: "Weekly lab", description: "Hands-on collaboration" }],
      videos: [],
      gallery: [],
      pageVisibleSections: ["about", "activities", "events", "people"],
      pageSectionHeadings: { about: "Why we gather" },
      pageTypography: "friendly",
      version: 1,
    })
    .returning({ id: clubs.id });
  return created.id;
}

async function upsertMembership(input: {
  id: string;
  userId: number;
  clubId: number;
  membershipRole: "president" | "member";
  canEditPage: boolean;
  canManageEvents: boolean;
  canManageMedia: boolean;
}) {
  const existing = await db.query.clubMemberships.findFirst({
    where: and(
      eq(clubMemberships.userId, input.userId),
      eq(clubMemberships.clubId, input.clubId),
    ),
  });
  if (existing) {
    await db
      .update(clubMemberships)
      .set({
        membershipRole: input.membershipRole,
        canEditPage: input.canEditPage,
        canManageEvents: input.canManageEvents,
        canManageMedia: input.canManageMedia,
        isActive: true,
        revokedAt: null,
        revokedByUserId: null,
      })
      .where(eq(clubMemberships.id, existing.id));
    return;
  }
  await db.insert(clubMemberships).values(input);
}

async function main() {
  passwordHash = await bcrypt.hash(password, 10);
  const primaryClubId = await upsertClub("E2E Makers", "e2e-makers");
  const secondClubId = await upsertClub("E2E Culture", "e2e-culture");
  const presidentId = await upsertUser("president@club-studio.test", "Priya President", "club_lead");
  const memberId = await upsertUser("member@club-studio.test", "Milan Member", "viewer");
  await upsertUser("operations@club-studio.test", "Olivia Operations", "operations");
  await upsertUser("superadmin@club-studio.test", "Sam Super Admin", "super_admin");

  await upsertMembership({
    id: "e2e-president-primary",
    userId: presidentId,
    clubId: primaryClubId,
    membershipRole: "president",
    canEditPage: true,
    canManageEvents: true,
    canManageMedia: true,
  });
  await upsertMembership({
    id: "e2e-president-secondary",
    userId: presidentId,
    clubId: secondClubId,
    membershipRole: "member",
    canEditPage: true,
    canManageEvents: true,
    canManageMedia: true,
  });
  await upsertMembership({
    id: "e2e-restricted-member",
    userId: memberId,
    clubId: primaryClubId,
    membershipRole: "member",
    canEditPage: true,
    canManageEvents: false,
    canManageMedia: false,
  });

  const existingEvent = await db.query.events.findFirst({
    where: eq(events.slug, "e2e-approved-event"),
  });
  if (!existingEvent) {
    await db.insert(events).values({
      title: "Approved E2E Event",
      slug: "e2e-approved-event",
      status: "published",
      category: "community",
      date: "2030-10-10T10:00:00.000Z",
      endDate: "2030-10-10T12:00:00.000Z",
      venue: "Test auditorium",
      excerpt: "An approved event used by browser smoke checks.",
      description: "Browser fixture event.",
      organizerId: presidentId,
      clubId: primaryClubId,
      version: 1,
      publishedAt: new Date().toISOString(),
    });
  }

  console.log("Club Studio browser fixtures ready.");
  console.log(`Password: ${password}`);
  console.log("Users: president, member, operations, superadmin @club-studio.test");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
