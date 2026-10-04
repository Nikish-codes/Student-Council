/**
 * Manual migration applier — run explicitly, NEVER on cold start.
 *
 *   npx drizzle-kit generate   # produce SQL in ./drizzle from schema.ts
 *   npm run db:migrate         # apply it (this script)
 *
 * Applies the generated SQL files directly via libSQL `executeMultiple`. The
 * built-in drizzle libsql migrator was a silent no-op against remote Turso
 * (HTTP), so we run the statements ourselves and track applied files in a
 * small `mp_migrations` table. Only `mp_*` objects are created (see
 * drizzle.config.ts tablesFilter), so Payload's tables are left intact.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

const MIGRATIONS_DIR = "./drizzle";

async function main() {
  const url = process.env.LIBSQL_URL || "file:./payload.db";
  const client = createClient({ url, authToken: process.env.LIBSQL_AUTH_TOKEN });
  console.log("Applying mp_* migrations to", url);

  await client.execute(
    `CREATE TABLE IF NOT EXISTS mp_migrations (tag TEXT PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  );
  const applied = new Set(
    (await client.execute("SELECT tag FROM mp_migrations")).rows.map((r) =>
      String(r.tag),
    ),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const tag = file.replace(/\.sql$/, "");
    if (applied.has(tag)) {
      console.log(`  • ${tag} (already applied, skipping)`);
      continue;
    }
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    // Split on drizzle's breakpoint marker so each statement runs independently.
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (err: unknown) {
        const msg = String((err as Error)?.message || "");
        if (
          msg.includes("duplicate column name") ||
          msg.includes("already exists")
        ) {
          console.log(`    ⚠ ${msg} (skipping already applied statement)`);
        } else {
          throw err;
        }
      }
    }
    await client.execute({
      sql: "INSERT INTO mp_migrations (tag) VALUES (?)",
      args: [tag],
    });
    console.log(`  ✓ ${tag} (${statements.length} statements)`);
  }

  console.log("✓ Migrations applied.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
