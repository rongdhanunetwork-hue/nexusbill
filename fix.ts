import { db } from './src/db/index';
import { users, olts } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function fix() {
  const allOlts = await db.select().from(olts);
  const allUsers = await db.select().from(users);
  
  if (allOlts.length > 0 && allUsers.length > 0) {
    let oltIndex = 0;
    for (const u of allUsers) {
      const targetOlt = allOlts[oltIndex % allOlts.length];
      await db.update(users).set({ oltId: targetOlt.id }).where(eq(users.id, u.id));
      oltIndex++;
    }
    console.log('Fixed users OLT IDs');
  } else {
    console.log('No users or OLTs found');
  }
  process.exit(0);
}
fix();
