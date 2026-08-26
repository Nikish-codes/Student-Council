import { createClient } from "@libsql/client";
import { and, eq, isNull } from "drizzle-orm";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  user: {
    id: "0",
    name: "Test user",
    email: "test@example.com",
    role: "viewer",
    clubId: null as number | null,
    mustChangePassword: false,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/rbac", () => ({
  requireUser: async () => authState.user,
  requireReviewer: async () => {
    if (!["super_admin", "operations"].includes(authState.user.role)) {
      throw new Error("FORBIDDEN");
    }
    return authState.user;
  },
}));

type Loaded = Awaited<ReturnType<typeof loadWorkflow>>;
let loaded: Loaded;
let sequence = 0;

async function loadWorkflow() {
  const root = mkdtempSync(join(tmpdir(), "club-workflow-"));
  const url = `file:${join(root, "workflow.db")}`;
  process.env.LIBSQL_URL = url;
  delete process.env.LIBSQL_AUTH_TOKEN;

  const client = createClient({ url });
  for (const file of readdirSync(join(process.cwd(), "drizzle"))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    const sql = readFileSync(join(process.cwd(), "drizzle", file), "utf8");
    for (const statement of sql
      .split("--> statement-breakpoint")
      .map((value) => value.trim())
      .filter(Boolean)) {
      await client.execute(statement);
    }
  }
  client.close();

  delete (globalThis as { __mpLibsql?: unknown }).__mpLibsql;
  delete (globalThis as { __mpDb?: unknown }).__mpDb;
  vi.resetModules();

  const [{ db }, schema, access, revisions, automation, eventDeletion] =
    await Promise.all([
      import("@/db/client"),
      import("@/db/schema"),
      import("@/lib/club-access"),
      import("@/lib/revisions"),
      import("@/lib/automation/on-publish"),
      import("@/lib/event-deletion"),
    ]);
  return { db, schema, access, revisions, automation, eventDeletion };
}

function setActor(user: {
  id: number;
  name: string;
  email: string;
  role: string;
  clubId?: number | null;
  mustChangePassword?: boolean;
}) {
  authState.user = {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    clubId: user.clubId ?? null,
    mustChangePassword: user.mustChangePassword ?? false,
  };
}

async function seedUser(role = "viewer", name = "Member") {
  const { db, schema } = loaded;
  const token = ++sequence;
  const [user] = await db
    .insert(schema.users)
    .values({
      name: `${name} ${token}`,
      email: `workflow-${token}@example.com`,
      password: `existing-hash-${token}`,
      role: role as typeof schema.users.$inferInsert.role,
    })
    .returning();
  return user;
}

async function seedClub(name = "Workflow Club") {
  const { db, schema } = loaded;
  const token = ++sequence;
  const [club] = await db
    .insert(schema.clubs)
    .values({
      name: `${name} ${token}`,
      slug: `workflow-club-${token}`,
      blurb: "A club used to verify the complete publication workflow.",
      version: 1,
    })
    .returning();
  return club;
}

async function addMembership(
  userId: number,
  clubId: number,
  role: "president" | "member" = "member",
) {
  const { db, schema } = loaded;
  await db.insert(schema.clubMemberships).values({
    id: `membership-${++sequence}`,
    userId,
    clubId,
    membershipRole: role,
    canEditPage: true,
    canManageEvents: true,
    canManageMedia: true,
  });
  return db.query.clubMemberships.findFirst({
    where: and(
      eq(schema.clubMemberships.userId, userId),
      eq(schema.clubMemberships.clubId, clubId),
    ),
  });
}

function pageSnapshot(name: string) {
  return {
    name,
    blurb: "A complete and valid public club introduction for review.",
    tagline: "Built together",
    about: "Long-form club story.",
    logoId: null,
    coverId: null,
    joinUrl: "https://example.com/join",
    members: 42,
    foundedYear: 2020,
    flagshipEvent: "Open House",
    activities: [{ title: "Workshops", description: "Weekly practice" }],
    videos: [{ url: "https://youtu.be/dQw4w9WgXcQ" }],
    gallery: [],
    instagramUrl: "https://instagram.com/example",
    linkedinUrl: null,
    websiteUrl: "https://example.com",
    contactEmail: "club@example.com",
    pageTemplate: "stage" as const,
    pageTheme: {
      background: "#0b0705",
      foreground: "#fff5e9",
      accent: "#ff5a1f",
      logoTreatment: "natural" as const,
    },
    pageVisibleSections: [
      "about",
      "activities",
      "videos",
      "events",
      "gallery",
      "people",
    ] as const,
    pageSectionHeadings: { about: "Our story" },
    pageTypography: "friendly" as const,
  };
}

function eventSnapshot(clubId: number, title: string, slug: string) {
  return {
    title,
    slug,
    category: "community" as const,
    date: "2030-09-20T10:00:00.000Z",
    endDate: "2030-09-20T12:00:00.000Z",
    venue: "Main auditorium",
    excerpt: "A valid event description for public listings.",
    description: "Full event details.",
    bannerId: null,
    videoUrl: null,
    registrationUrl: null,
    attendees: null,
    featured: false,
    clubId,
    clubIds: [clubId],
    registrationEnabled: true,
    priceInPaise: 0,
    capacity: 120,
  };
}

function eventRow(clubId: number, title: string, slug: string) {
  const { clubIds: _clubIds, ...row } = eventSnapshot(clubId, title, slug);
  void _clubIds;
  return row;
}

beforeAll(async () => {
  loaded = await loadWorkflow();
});

describe.sequential("club workflow integration", () => {
  it("enforces membership boundaries and audits invitations, permission changes, revocation, and presidency transfer", async () => {
    const { db, schema, access } = loaded;
    const president = await seedUser("club_lead", "President");
    const existing = await seedUser("viewer", "Existing member");
    const club = await seedClub("Access Club");
    const otherClub = await seedClub("Other Club");
    await addMembership(president.id, club.id, "president");
    setActor({ ...president, clubId: club.id });

    await expect(
      access.requireClubMembership(otherClub.id, "edit_page"),
    ).rejects.toThrow("FORBIDDEN");

    await access.inviteClubMember({
      clubId: club.id,
      email: `new-${sequence}@example.com`,
      name: "New member",
      temporaryPassword: "temporary-password",
      canEditPage: true,
      canManageEvents: false,
      canManageMedia: true,
    });
    const invited = await db.query.users.findFirst({
      where: eq(schema.users.email, `new-${sequence}@example.com`),
    });
    expect(invited?.mustChangePassword).toBe(true);
    expect(invited?.password).not.toBe("temporary-password");

    await access.inviteClubMember({
      clubId: club.id,
      email: existing.email,
      name: existing.name,
      temporaryPassword: "",
      canEditPage: false,
      canManageEvents: true,
      canManageMedia: false,
    });
    const unchanged = await db.query.users.findFirst({
      where: eq(schema.users.id, existing.id),
    });
    expect(unchanged?.password).toBe(existing.password);
    expect(unchanged?.mustChangePassword).toBe(false);

    const existingMembership = await db.query.clubMemberships.findFirst({
      where: and(
        eq(schema.clubMemberships.userId, existing.id),
        eq(schema.clubMemberships.clubId, club.id),
      ),
    });
    expect(existingMembership).toBeTruthy();
    await access.updateClubMemberAccess({
      clubId: club.id,
      membershipId: existingMembership!.id,
      canEditPage: true,
      canManageEvents: true,
      canManageMedia: true,
    });

    const invitedMembership = await db.query.clubMemberships.findFirst({
      where: eq(schema.clubMemberships.userId, invited!.id),
    });
    await access.transferClubPresidency({
      clubId: club.id,
      membershipId: invitedMembership!.id,
      confirmation: club.name,
    });
    const former = await db.query.clubMemberships.findFirst({
      where: and(
        eq(schema.clubMemberships.userId, president.id),
        eq(schema.clubMemberships.clubId, club.id),
      ),
    });
    const next = await db.query.clubMemberships.findFirst({
      where: eq(schema.clubMemberships.id, invitedMembership!.id),
    });
    expect(former?.membershipRole).toBe("member");
    expect(next?.membershipRole).toBe("president");

    setActor({ ...invited!, clubId: null });
    await access.updateClubMemberAccess({
      clubId: club.id,
      membershipId: existingMembership!.id,
      canEditPage: false,
      canManageEvents: false,
      canManageMedia: false,
      revoke: true,
    });
    const revoked = await db.query.clubMemberships.findFirst({
      where: eq(schema.clubMemberships.id, existingMembership!.id),
    });
    expect(revoked?.isActive).toBe(false);

    const audit = await db.query.auditLog.findMany({
      where: eq(schema.auditLog.clubId, club.id),
    });
    expect(audit.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        "club_member.temporary_password_created",
        "club_member.invited",
        "club_member.access_granted",
        "club_member.permissions_changed",
        "club.presidency_transferred",
        "club_member.access_revoked",
      ]),
    );
  });

  it("preserves public club content through request-changes, resubmission, decline, withdrawal, and stale approval", async () => {
    const { db, schema, revisions } = loaded;
    const author = await seedUser("viewer", "Page author");
    const reviewer = await seedUser("operations", "Reviewer");
    const club = await seedClub("Revision Club");
    const otherClub = await seedClub("Protected Club");
    await addMembership(author.id, club.id);
    setActor(author);

    const first = await revisions.saveRevisionDraft({
      entityType: "club_page",
      entityId: club.id,
      clubId: club.id,
      baseVersion: 1,
      snapshot: {
        ...pageSnapshot("Approved after changes"),
        people: [
          {
            name: "Public club member",
            role: "Design lead",
            program: "Class of 2030",
            photoId: null,
            email: null,
            linkedin: null,
            quote: null,
            bio: "Builds the club's visual identity.",
            sortOrder: 0,
          },
        ],
      },
    });
    await revisions.submitRevision(first);
    expect(
      (await db.query.clubs.findFirst({ where: eq(schema.clubs.id, club.id) }))
        ?.name,
    ).toBe(club.name);
    expect(
      await db.query.councilMembers.findFirst({
        where: eq(schema.councilMembers.clubId, club.id),
      }),
    ).toBeUndefined();

    setActor(reviewer);
    await revisions.reviewRevision({
      revisionId: first,
      action: "request_changes",
      note: "Clarify the introduction.",
    });
    const replacement = await db.query.contentRevisions.findFirst({
      where: eq(schema.contentRevisions.supersedesRevisionId, first),
    });
    expect(replacement?.status).toBe("draft");

    setActor(author);
    await revisions.submitRevision(replacement!.id);
    setActor(reviewer);
    await revisions.reviewRevision({
      revisionId: replacement!.id,
      action: "approve",
    });
    const approved = await db.query.clubs.findFirst({
      where: eq(schema.clubs.id, club.id),
    });
    expect(approved?.name).toBe("Approved after changes");
    expect(approved?.version).toBe(2);
    expect(
      await db.query.councilMembers.findFirst({
        where: eq(schema.councilMembers.clubId, club.id),
      }),
    ).toMatchObject({ name: "Public club member", role: "Design lead" });

    setActor(author);
    const declined = await revisions.saveRevisionDraft({
      entityType: "club_page",
      entityId: club.id,
      clubId: club.id,
      baseVersion: 2,
      snapshot: pageSnapshot("Declined title"),
    });
    await revisions.submitRevision(declined);
    setActor(reviewer);
    await revisions.reviewRevision({
      revisionId: declined,
      action: "decline",
      note: "Not aligned.",
    });
    expect(
      (
        await db.query.contentRevisions.findFirst({
          where: eq(schema.contentRevisions.id, declined),
        })
      )?.status,
    ).toBe("declined");

    setActor(author);
    const withdrawn = await revisions.saveRevisionDraft({
      entityType: "club_page",
      entityId: club.id,
      clubId: club.id,
      baseVersion: 2,
      snapshot: pageSnapshot("Withdrawn title"),
    });
    await revisions.submitRevision(withdrawn);
    await revisions.withdrawRevision(withdrawn);
    expect(
      (
        await db.query.contentRevisions.findFirst({
          where: eq(schema.contentRevisions.id, withdrawn),
        })
      )?.status,
    ).toBe("withdrawn");
    expect(
      await db.query.auditLog.findFirst({
        where: and(
          eq(schema.auditLog.revisionId, withdrawn),
          eq(schema.auditLog.action, "club_page.withdrawn"),
        ),
      }),
    ).toBeTruthy();

    const stale = await revisions.saveRevisionDraft({
      entityType: "club_page",
      entityId: club.id,
      clubId: club.id,
      baseVersion: 2,
      snapshot: pageSnapshot("Stale title"),
    });
    await revisions.submitRevision(stale);
    await db
      .update(schema.clubs)
      .set({ version: 3 })
      .where(eq(schema.clubs.id, club.id));
    setActor(reviewer);
    await expect(
      revisions.reviewRevision({ revisionId: stale, action: "approve" }),
    ).rejects.toThrow("STALE_REVISION");

    const protectedEvent = await db
      .insert(schema.events)
      .values({
        ...eventRow(otherClub.id, "Protected event", `protected-${++sequence}`),
        status: "draft",
        version: 0,
      })
      .returning();
    setActor(author);
    await expect(
      revisions.saveRevisionDraft({
        entityType: "event",
        entityId: protectedEvent[0].id,
        clubId: club.id,
        baseVersion: 0,
        snapshot: eventSnapshot(
          club.id,
          "Cross-club edit",
          `cross-${++sequence}`,
        ),
      }),
    ).rejects.toThrow("ENTITY_CLUB_MISMATCH");
  });

  it("keeps new and edited events private until approval and runs publication automation once", async () => {
    const { db, schema, revisions, automation } = loaded;
    const author = await seedUser("viewer", "Event author");
    const reviewer = await seedUser("operations", "Event reviewer");
    const club = await seedClub("Events Club");
    const cohost = await seedClub("Co-host Club");
    await addMembership(author.id, club.id);
    const initial = eventSnapshot(
      club.id,
      "Private launch",
      `private-launch-${++sequence}`,
    );
    const [event] = await db
      .insert(schema.events)
      .values({
        ...eventRow(club.id, initial.title, initial.slug),
        status: "draft",
        version: 0,
        organizerId: author.id,
      })
      .returning();

    setActor(author);
    const revision = await revisions.saveRevisionDraft({
      entityType: "event",
      entityId: event.id,
      clubId: club.id,
      baseVersion: 0,
      snapshot: initial,
    });
    await revisions.submitRevision(revision);
    expect(
      (
        await db.query.events.findFirst({
          where: eq(schema.events.id, event.id),
        })
      )?.status,
    ).toBe("draft");

    setActor(reviewer);
    await revisions.reviewRevision({ revisionId: revision, action: "approve" });
    expect(
      (
        await db.query.events.findFirst({
          where: eq(schema.events.id, event.id),
        })
      )?.status,
    ).toBe("published");
    await automation.onEventPublished(event.id);
    expect(
      (
        await db.query.announcements.findMany({
          where: eq(schema.announcements.eventId, event.id),
        })
      ).length,
    ).toBe(1);
    expect(
      (
        await db.query.recaps.findMany({
          where: eq(schema.recaps.eventId, event.id),
        })
      ).length,
    ).toBe(1);

    const editedSnapshot = {
      ...initial,
      title: "Approved launch update",
      clubIds: [club.id, cohost.id],
    };
    setActor(author);
    const edit = await revisions.saveRevisionDraft({
      entityType: "event",
      entityId: event.id,
      clubId: club.id,
      baseVersion: 1,
      snapshot: editedSnapshot,
    });
    await revisions.submitRevision(edit);
    expect(
      (
        await db.query.events.findFirst({
          where: eq(schema.events.id, event.id),
        })
      )?.title,
    ).toBe("Private launch");
    expect(
      await db.query.eventClubs.findFirst({
        where: and(
          eq(schema.eventClubs.eventId, event.id),
          eq(schema.eventClubs.clubId, cohost.id),
        ),
      }),
    ).toBeUndefined();
    setActor(reviewer);
    await revisions.reviewRevision({ revisionId: edit, action: "approve" });
    const updated = await db.query.events.findFirst({
      where: eq(schema.events.id, event.id),
    });
    expect(updated?.title).toBe("Approved launch update");
    expect(updated?.version).toBe(2);
    expect(
      await db.query.eventClubs.findFirst({
        where: and(
          eq(schema.eventClubs.eventId, event.id),
          eq(schema.eventClubs.clubId, cohost.id),
        ),
      }),
    ).toBeTruthy();
    expect(
      (
        await db.query.announcements.findMany({
          where: eq(schema.announcements.eventId, event.id),
        })
      ).length,
    ).toBe(1);
  });

  it("creates persistent follow-up tasks without endDate and clears them only after approved valid media", async () => {
    const { db, schema, revisions } = loaded;
    const author = await seedUser("viewer", "Media author");
    const reviewer = await seedUser("operations", "Media reviewer");
    const club = await seedClub("Media Club");
    await addMembership(author.id, club.id);
    const [event] = await db
      .insert(schema.events)
      .values({
        ...eventRow(club.id, "Past event", `past-event-${++sequence}`),
        date: "2020-01-01T10:00:00.000Z",
        endDate: null,
        status: "published",
        version: 1,
        publishedAt: "2020-01-01T09:00:00.000Z",
      })
      .returning();

    await revisions.ensureEventFollowupTasks(club.id);
    await revisions.ensureEventFollowupTasks(club.id);
    const tasks = await db.query.eventFollowupTasks.findMany({
      where: eq(schema.eventFollowupTasks.eventId, event.id),
    });
    const recap = await db.query.recaps.findFirst({
      where: eq(schema.recaps.eventId, event.id),
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe("open");
    expect(recap).toBeTruthy();

    const [photo] = await db
      .insert(schema.media)
      .values({
        alt: "Approved event photo",
        url: "https://example.com/photo.jpg",
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        filesize: 512_000,
      })
      .returning();
    setActor(author);
    const followup = await revisions.saveRevisionDraft({
      entityType: "event_followup",
      entityId: recap!.id,
      clubId: club.id,
      baseVersion: 0,
      snapshot: {
        title: recap!.title,
        kicker: "Highlights",
        blurb: "What happened at the event.",
        heroMediaId: photo.id,
        photoMediaIds: [photo.id],
        videoLinks: [],
      },
    });
    await revisions.submitRevision(followup);
    expect(
      (
        await db.query.eventFollowupTasks.findFirst({
          where: eq(schema.eventFollowupTasks.eventId, event.id),
        })
      )?.status,
    ).toBe("open");
    setActor(reviewer);
    await revisions.reviewRevision({ revisionId: followup, action: "approve" });
    expect(
      (
        await db.query.eventFollowupTasks.findFirst({
          where: eq(schema.eventFollowupTasks.eventId, event.id),
        })
      )?.status,
    ).toBe("completed");
    expect(
      (
        await db.query.recaps.findFirst({
          where: eq(schema.recaps.id, recap!.id),
        })
      )?.status,
    ).toBe("published");
  });

  it("promotes only an explicitly featured published event", async () => {
    const { db, schema, automation } = loaded;
    const admin = await seedUser("super_admin", "Featuring admin");
    const club = await seedClub("Featured Events Club");
    const [currentFeature] = await db
      .insert(schema.events)
      .values({
        ...eventRow(
          club.id,
          "Current feature",
          `current-feature-${++sequence}`,
        ),
        status: "published",
        featured: true,
        version: 1,
        organizerId: admin.id,
      })
      .returning();
    const [pendingFeature] = await db
      .insert(schema.events)
      .values({
        ...eventRow(
          club.id,
          "Pending feature",
          `pending-feature-${++sequence}`,
        ),
        status: "draft",
        featured: true,
        version: 0,
        organizerId: admin.id,
      })
      .returning();
    const [flagshipCategoryOnly] = await db
      .insert(schema.events)
      .values({
        ...eventRow(
          club.id,
          "Flagship category only",
          `flagship-category-only-${++sequence}`,
        ),
        category: "flagship",
        status: "published",
        featured: false,
        version: 1,
        organizerId: admin.id,
      })
      .returning();
    await db
      .insert(schema.homepageConfig)
      .values({ id: 1, flagshipEventId: currentFeature.id })
      .onConflictDoUpdate({
        target: schema.homepageConfig.id,
        set: { flagshipEventId: currentFeature.id },
      });

    await automation.onEventPublished(flagshipCategoryOnly.id);
    expect(
      (
        await db.query.homepageConfig.findFirst({
          where: eq(schema.homepageConfig.id, 1),
        })
      )?.flagshipEventId,
    ).toBe(currentFeature.id);

    const [nextFeature] = await db
      .insert(schema.events)
      .values({
        ...eventRow(club.id, "Next feature", `next-feature-${++sequence}`),
        status: "published",
        featured: true,
        version: 1,
        organizerId: admin.id,
      })
      .returning();
    await automation.onEventPublished(nextFeature.id);
    expect(
      (
        await db.query.homepageConfig.findFirst({
          where: eq(schema.homepageConfig.id, 1),
        })
      )?.flagshipEventId,
    ).toBe(nextFeature.id);
    expect(
      (
        await db.query.events.findFirst({
          where: eq(schema.events.id, currentFeature.id),
        })
      )?.featured,
    ).toBe(false);
    expect(
      (
        await db.query.events.findFirst({
          where: eq(schema.events.id, pendingFeature.id),
        })
      )?.featured,
    ).toBe(true);
  });

  it("deletes an event and every event-owned record in one transaction", async () => {
    const { db, schema, eventDeletion } = loaded;
    const admin = await seedUser("admin", "Deleting admin");
    const attendeeUser = await seedUser("viewer", "Attendee");
    const club = await seedClub("Deletion Club");
    const [event] = await db
      .insert(schema.events)
      .values({
        ...eventRow(club.id, "Delete me", `delete-me-${++sequence}`),
        status: "published",
        featured: true,
        version: 1,
        organizerId: admin.id,
        publishedAt: "2030-09-01T10:00:00.000Z",
      })
      .returning();
    await db.insert(schema.eventClubs).values({
      eventId: event.id,
      clubId: club.id,
    });
    const [recap] = await db
      .insert(schema.recaps)
      .values({
        title: "Delete me — Recap",
        slug: `delete-me-recap-${++sequence}`,
        eventId: event.id,
        status: "draft",
      })
      .returning();
    await db.insert(schema.eventFollowupTasks).values({
      id: `followup-${++sequence}`,
      eventId: event.id,
      clubId: club.id,
    });
    await db.insert(schema.announcements).values({
      title: "New event: Delete me",
      date: "2030-09-01T10:00:00.000Z",
      eventId: event.id,
    });
    const registrationId = `registration-${++sequence}`;
    await db.insert(schema.eventRegistrations).values({
      id: registrationId,
      eventId: event.id,
      name: attendeeUser.name,
      email: attendeeUser.email,
    });
    await db.insert(schema.attendees).values({
      id: `attendee-${++sequence}`,
      registrationId,
      eventId: event.id,
      ticketCode: `ticket-${++sequence}`,
    });
    await db.insert(schema.notifications).values({
      id: `notification-${++sequence}`,
      registrationId,
      template: "ticket-issued",
    });
    const eventRevisionId = `event-revision-${++sequence}`;
    const followupRevisionId = `followup-revision-${++sequence}`;
    await db.insert(schema.contentRevisions).values([
      {
        id: eventRevisionId,
        entityType: "event",
        entityId: event.id,
        clubId: club.id,
        snapshot: eventSnapshot(club.id, event.title, event.slug),
        baseVersion: 1,
        authorUserId: admin.id,
      },
      {
        id: followupRevisionId,
        entityType: "event_followup",
        entityId: recap.id,
        clubId: club.id,
        snapshot: { title: recap.title, photoMediaIds: [], videoLinks: [] },
        baseVersion: 0,
        authorUserId: admin.id,
      },
    ]);
    await db.insert(schema.auditLog).values({
      id: `event-audit-${++sequence}`,
      actorUserId: admin.id,
      eventId: event.id,
      clubId: club.id,
      action: "event.created",
      targetId: String(event.id),
    });
    await db
      .insert(schema.homepageConfig)
      .values({ id: 1, flagshipEventId: event.id })
      .onConflictDoUpdate({
        target: schema.homepageConfig.id,
        set: { flagshipEventId: event.id },
      });

    const result = await eventDeletion.deleteEventEverywhere({
      eventId: event.id,
      actorUserId: admin.id,
    });
    expect(result).toMatchObject({ id: event.id, slug: event.slug });
    expect(
      await db.query.events.findFirst({
        where: eq(schema.events.id, event.id),
      }),
    ).toBeUndefined();
    expect(
      await db.query.eventClubs.findFirst({
        where: eq(schema.eventClubs.eventId, event.id),
      }),
    ).toBeUndefined();
    expect(
      await db.query.eventRegistrations.findFirst({
        where: eq(schema.eventRegistrations.eventId, event.id),
      }),
    ).toBeUndefined();
    expect(
      await db.query.attendees.findFirst({
        where: eq(schema.attendees.eventId, event.id),
      }),
    ).toBeUndefined();
    expect(
      await db.query.notifications.findFirst({
        where: eq(schema.notifications.registrationId, registrationId),
      }),
    ).toBeUndefined();
    expect(
      await db.query.eventFollowupTasks.findFirst({
        where: eq(schema.eventFollowupTasks.eventId, event.id),
      }),
    ).toBeUndefined();
    expect(
      await db.query.announcements.findFirst({
        where: eq(schema.announcements.eventId, event.id),
      }),
    ).toBeUndefined();
    expect(
      await db.query.recaps.findFirst({
        where: eq(schema.recaps.eventId, event.id),
      }),
    ).toBeUndefined();
    expect(
      await db.query.contentRevisions.findFirst({
        where: eq(schema.contentRevisions.id, eventRevisionId),
      }),
    ).toBeUndefined();
    expect(
      await db.query.contentRevisions.findFirst({
        where: eq(schema.contentRevisions.id, followupRevisionId),
      }),
    ).toBeUndefined();
    expect(
      (
        await db.query.homepageConfig.findFirst({
          where: eq(schema.homepageConfig.id, 1),
        })
      )?.flagshipEventId,
    ).toBeNull();
    expect(
      await db.query.auditLog.findFirst({
        where: and(
          eq(schema.auditLog.action, "event.deleted"),
          eq(schema.auditLog.targetId, String(event.id)),
          isNull(schema.auditLog.eventId),
        ),
      }),
    ).toBeTruthy();
  });
});
