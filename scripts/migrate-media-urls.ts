/**
 * One-time migration: point every stored R2 URL at the bucket's custom domain.
 * Replaces the r2.dev host with R2_PUBLIC_URL across every TEXT column of every
 * mp_* table (full URLs live in plain and JSON columns alike).
 *
 *   npm run db:migrate-from-payload  # unrelated legacy flow, not this
 *   npx tsx scripts/migrate-media-urls.ts [--dry-run]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@libsql/client";

const OLD_HOST = "https://pub-88f0a7c5d200469fa7dbb8f90c605d45.r2.dev";
const NEW_HOST = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

if (!NEW_HOST) {
  console.error("R2_PUBLIC_URL is not set; aborting.");
  process.exit(1);
}
if (NEW_HOST === OLD_HOST) {
  console.error("R2_PUBLIC_URL already matches the r2.dev host; nothing to do.");
  process.exit(1);
}

const raw = createClient({
  url: process.env.LIBSQL_URL!,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});
const DRY = process.argv.includes("--dry-run");

async function main() {
  const tables = await raw.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'mp_%'",
  );
  let total = 0;
  for (const { name: table } of tables.rows) {
    const cols = await raw.execute(`PRAGMA table_info(${table})`);
    for (const col of cols.rows) {
      const column = String(col[1]);
      if (String(col[2]).toUpperCase() !== "TEXT") continue;
      const find = `SELECT COUNT(*) FROM ${table} WHERE \`${column}\` LIKE '%${OLD_HOST}%'`;
      const count = Number(
        (await raw.execute(find)).rows[0]?.[0] ?? 0,
      );
      if (!count) continue;
      if (DRY) {
        console.log(`${table}.${column}: ${count} row(s) would be rewritten`);
        total += count;
        continue;
      }
      const result = await raw.execute(
        `UPDATE ${table} SET "${column}" = replace("${column}", '${OLD_HOST}', '${NEW_HOST}') WHERE "${column}" LIKE '%${OLD_HOST}%'`,
      );
      console.log(`${table}.${column}: ${result.rowsAffected} rewritten`);
      total += result.rowsAffected;
    }
  }
  console.log(
    `${DRY ? "Dry run. " : "Done. "}${total} URL values now point at ${NEW_HOST}`,
  );
}

main();
