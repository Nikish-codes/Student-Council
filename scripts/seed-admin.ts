/**
 * Seed / reset the first super-admin from environment variables. This REPLACES
 * the old hardcoded backdoor — the only admin credential is the one you set in
 * the environment, and it lives as a normal bcrypt row in mp_users.
 *
 *   SEED_SUPER_ADMIN_EMAIL=you@org.edu SEED_SUPER_ADMIN_PASSWORD=... \
 *     npm run db:seed-admin
 *
 * Idempotent: if the email exists, its password is (re)set and role promoted to
 * super_admin; otherwise a new super_admin row is created.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import * as schema from "../src/db/schema";
import { users } from "../src/db/schema";

// Build the client AFTER dotenv (see note in migrate-from-payload.ts).
const raw = createClient({
  url: process.env.LIBSQL_URL!,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});
const db = drizzle(raw, { schema });

async function main() {
  const email = (process.env.SEED_SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "";
  if (!email || !password) {
    console.error(
      "Set SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD in .env.local first.",
    );
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const existing = (
    await db.select().from(users).where(eq(users.email, email)).limit(1)
  )[0];

  if (existing) {
    await db
      .update(users)
      .set({ password: hash, role: "super_admin" })
      .where(eq(users.id, existing.id));
    console.log(`✓ Reset password + promoted existing user to super_admin: ${email}`);
  } else {
    await db.insert(users).values({
      name: "Super Admin",
      email,
      password: hash,
      role: "super_admin",
    });
    console.log(`✓ Created super_admin: ${email}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
