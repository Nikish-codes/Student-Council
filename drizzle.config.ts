import type { Config } from "drizzle-kit";
import { config } from "dotenv";

// Load the same env file the app uses so drizzle-kit hits the right database.
config({ path: ".env.local" });

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.LIBSQL_URL || "file:./payload.db",
    authToken: process.env.LIBSQL_AUTH_TOKEN,
  },
  // Only manage our prefixed tables; never touch Payload's tables.
  tablesFilter: ["mp_*"],
} satisfies Config;
