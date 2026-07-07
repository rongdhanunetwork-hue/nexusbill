import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import { getPppoeSecrets } from './src/lib/mikrotik.js';

async function main() {
  const unpaidUsers = await db.query.users.findMany({ where: eq(users.status, 'unpaid') });
  console.log(`Found ${unpaidUsers.length} unpaid users in DB.`);
  if (unpaidUsers.length > 0) {
    const user = unpaidUsers[0];
    console.log(`Checking user: ${user.pppoeUsername} (Router: ${user.mikrotikId})`);
    try {
      const secrets = await getPppoeSecrets(user.mikrotikId);
      const secret = secrets.find(s => s.name.toLowerCase() === user.pppoeUsername?.toLowerCase());
      console.log('Mikrotik Secret:', secret);
    } catch (e) {
      console.error('Mikrotik Error:', e.message);
    }
  }
  process.exit(0);
}
main();
