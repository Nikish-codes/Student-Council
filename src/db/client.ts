/**
 * Drizzle database client over the existing Turso/libSQL database.
 *
 * Singleton-cached on `globalThis` so Next.js HMR in dev doesn't open a new
 * connection on every reload. Intentionally NOT marked `server-only` so the
 * one-off `tsx` scripts (migrate / seed) can reuse the same client.
 */
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";

import * as schema from "./schema";

const url = process.env.LIBSQL_URL || "file:./payload.db";
const authToken = process.env.LIBSQL_AUTH_TOKEN;

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  __mpLibsql?: Client;
  __mpDb?: DrizzleDb;
};

const libsql = globalForDb.__mpLibsql ?? createClient({ url, authToken });
export const db: DrizzleDb = globalForDb.__mpDb ?? drizzle(libsql, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__mpLibsql = libsql;
  globalForDb.__mpDb = db;
}

export { schema };
