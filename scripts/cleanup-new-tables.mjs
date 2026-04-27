import 'dotenv/config';
import { createClient } from '@libsql/client';

const c = createClient({
  url: process.env.LIBSQL_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});

// 1. Check for leftover __new_* tables from failed pushes (need to drop)
const tables = await c.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '\\_\\_new\\_%' ESCAPE '\\'",
);
console.log('leftover __new_ tables:', tables.rows.map((r) => r.name));
for (const row of tables.rows) {
  await c.execute(`DROP TABLE IF EXISTS "${row.name}"`);
  console.log('dropped', row.name);
}

// 2. Verify _status columns exist on the real tables
for (const t of ['recaps', 'clubs', 'council_members']) {
  const info = await c.execute(`PRAGMA table_info(${t})`);
  const cols = info.rows.map((r) => r.name);
  console.log(t, 'has _status:', cols.includes('_status'), 'cols:', cols.length);
}
