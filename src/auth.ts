/**
 * Full Auth.js setup (Node runtime). Credentials provider verifies bcrypt
 * passwords against the Drizzle `mp_users` table. No covert/backdoor account —
 * the only way in is a row with a real bcrypt password (seeded via env).
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { authConfig } from "@/auth.config";

const MAX_LOGIN_ATTEMPTS = 8;
const LOCK_MS = 10 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const row = (
          await db.select().from(users).where(eq(users.email, email)).limit(1)
        )[0];
        if (!row || !row.password) return null;

        // Account lockout: refuse while a lock is active.
        if (row.lockedUntil && new Date(row.lockedUntil).getTime() > Date.now()) {
          const mins = Math.ceil(
            (new Date(row.lockedUntil).getTime() - Date.now()) / 60_000,
          );
          throw new Error(`LOCKED:${mins}`);
        }

        const ok = await bcrypt.compare(password, row.password);
        if (!ok) {
          // Increment failures; lock for 10 minutes after 8 bad attempts.
          const fails = (row.failedLoginCount ?? 0) + 1;
          await db
            .update(users)
            .set({
              failedLoginCount: fails,
              lockedUntil:
                fails >= MAX_LOGIN_ATTEMPTS
                  ? new Date(Date.now() + LOCK_MS).toISOString()
                  : null,
            })
            .where(eq(users.id, row.id));
          const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - fails);
          throw new Error(`FAILED:${remaining}`);
        }

        // Success → clear any failure state.
        if (row.failedLoginCount || row.lockedUntil) {
          await db
            .update(users)
            .set({ failedLoginCount: 0, lockedUntil: null })
            .where(eq(users.id, row.id));
        }

        return {
          id: String(row.id),
          name: row.name,
          email: row.email,
          role: row.role,
          clubId: row.clubId ?? null,
          mustChangePassword: row.mustChangePassword,
        };
      },
    }),
  ],
});
