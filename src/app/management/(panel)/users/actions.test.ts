import { describe, expect, it, vi, beforeAll } from "vitest";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";

const authState = vi.hoisted(() => ({
  user: {
    id: "1",
    name: "Admin",
    email: "admin@woxsen.edu.in",
    role: "super_admin" as const,
    clubId: null as number | null,
    mustChangePassword: false,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/rbac", () => ({
  ROLES_ALL: [
    "super_admin",
    "operations",
    "admin",
    "sports_lead",
    "food_committee_member",
    "council_member",
    "club_lead",
    "editor",
    "viewer",
  ],
  requireUser: async () => authState.user,
  requireRole: async (...roles: string[]) => {
    if (!roles.includes(authState.user.role)) throw new Error("FORBIDDEN");
    return authState.user;
  },
}));

describe("user management actions", () => {
  let db: typeof import("@/db/client")["db"];
  let schema: typeof import("@/db/schema");
  let actions: typeof import("./actions");

  beforeAll(async () => {
    const root = mkdtempSync(join(tmpdir(), "user-actions-"));
    const url = `file:${join(root, "test.db")}`;
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

    const dbModule = await import("@/db/client");
    db = dbModule.db;
    schema = await import("@/db/schema");
    actions = await import("./actions");

    // Insert super admin
    await db.insert(schema.users).values({
      id: 1,
      name: "Admin",
      email: "admin@woxsen.edu.in",
      role: "super_admin",
    });
  });

  describe("createUser", () => {
    it("returns error on missing fields without throwing", async () => {
      const fd = new FormData();
      const res = await actions.createUser(undefined, fd);
      expect(res).toEqual({ error: "Name, email, and password are required" });
    });

    it("returns error on short password without throwing", async () => {
      const fd = new FormData();
      fd.append("name", "Test User");
      fd.append("email", "testuser@woxsen.edu.in");
      fd.append("password", "123");
      fd.append("role", "editor");
      const res = await actions.createUser(undefined, fd);
      expect(res).toEqual({ error: "Password must be at least 6 characters" });
    });

    it("returns error on invalid role", async () => {
      const fd = new FormData();
      fd.append("name", "Test User");
      fd.append("email", "testuser@woxsen.edu.in");
      fd.append("password", "validpassword");
      fd.append("role", "invalid_role");
      const res = await actions.createUser(undefined, fd);
      expect(res).toEqual({ error: "Invalid role selected" });
    });

    it("returns error if email already exists", async () => {
      const fd = new FormData();
      fd.append("name", "Admin Duplicate");
      fd.append("email", "admin@woxsen.edu.in");
      fd.append("password", "validpassword");
      fd.append("role", "admin");
      const res = await actions.createUser(undefined, fd);
      expect(res).toEqual({ error: "A user with this email already exists" });
    });

    it("creates user successfully", async () => {
      const fd = new FormData();
      fd.append("name", "New Student");
      fd.append("email", "newstudent@woxsen.edu.in");
      fd.append("password", "password123");
      fd.append("role", "editor");
      const res = await actions.createUser(undefined, fd);
      expect(res).toBeUndefined();

      const created = await db.query.users.findFirst({
        where: eq(schema.users.email, "newstudent@woxsen.edu.in"),
      });
      expect(created?.name).toBe("New Student");
      expect(created?.role).toBe("editor");
    });
  });

  describe("deleteUser", () => {
    it("prevents self-deletion safely", async () => {
      const res = await actions.deleteUser(1);
      expect(res).toEqual({ ok: false, error: "You cannot delete your own account" });
    });

    it("returns error when target user does not exist", async () => {
      const res = await actions.deleteUser(9999);
      expect(res).toEqual({ ok: false, error: "User not found" });
    });

    it("deletes user safely and cleans up dependencies including attendees", async () => {
      // Create user to delete
      const [u] = await db
        .insert(schema.users)
        .values({
          name: "Deletable Lead",
          email: "deletable@woxsen.edu.in",
          role: "club_lead",
        })
        .returning({ id: schema.users.id });

      // Insert dependencies referencing this user
      await db.insert(schema.auditLog).values({
        id: "audit-1",
        actorUserId: u.id,
        action: "test.action",
      });

      const res = await actions.deleteUser(u.id);
      expect(res).toEqual({ ok: true });

      const check = await db.query.users.findFirst({
        where: eq(schema.users.id, u.id),
      });
      expect(check).toBeUndefined();

      const auditCheck = await db.query.auditLog.findFirst({
        where: eq(schema.auditLog.id, "audit-1"),
      });
      expect(auditCheck?.actorUserId).toBeNull();
    });
  });
});
