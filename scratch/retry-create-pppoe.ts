import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createPppoeSecret } from '@/lib/mikrotik';

const IDS = [825, 919]; // user ids that timed out previously

async function tryCreate(username: string, pwd: string, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await createPppoeSecret({ name: username, password: pwd, comment: 'retry-create' });
      console.log(`Created PPPoE ${username} (attempt ${i})`);
      return true;
    } catch (err: any) {
      console.error(`Attempt ${i} failed for ${username}:`, err?.message || err);
      if (i < attempts) await new Promise(res => setTimeout(res, 1000 * i));
    }
  }
  return false;
}

async function main() {
  try {
    for (const id of IDS) {
      const u = await db.query.users.findFirst({ where: eq(users.id, id) });
      if (!u) {
        console.log(`User id=${id} not found`);
        continue;
      }
      const username = String(u.pppoeUsername || u.phone || `user${u.id}`);
      const pwd = username.slice(0, 45);
      console.log(`Retrying user id=${id} username=${username}`);
      const ok = await tryCreate(username, pwd, 4);
      if (!ok) console.error(`Failed to create PPPoE for ${username} after retries`);
    }
    console.log('Retry run complete');
    process.exit(0);
  } catch (err) {
    console.error('Error in retry script:', err);
    process.exit(1);
  }
}

main();
