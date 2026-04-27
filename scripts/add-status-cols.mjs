import 'dotenv/config';
import { createClient } from '@libsql/client';

const c = createClient({
  url: process.env.LIBSQL_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});

const tables = ['recaps', 'clubs', 'council_members'];
for (const t of tables) {
  try {
    const info = await c.execute(`PRAGMA table_info(${t})`);
    const cols = info.rows.map((r) => r.name);
    if (!cols.includes('_status')) {
      await c.execute(`ALTER TABLE ${t} ADD COLUMN _status text DEFAULT 'published'`);
      console.log('added _status to', t);
    } else {
      console.log(t, 'already has _status');
    }
  } catch (e) {
    console.log(t, 'err', e.message);
  }
}
