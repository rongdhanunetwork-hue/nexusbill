import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import { syncCustomerToMikrotik } from './src/lib/sync.js';

async function fix() {
  const expiredUsers = await db.query.users.findMany({ where: eq(users.status, 'expired') });
  console.log(`Found ${expiredUsers.length} expired users in DB. Force syncing to Mikrotik...`);
  
  let successCount = 0;
  for (const user of expiredUsers) {
    if (user.pppoeUsername) {
      console.log(`Force syncing ${user.pppoeUsername}...`);
      try {
        await syncCustomerToMikrotik(user.pppoeUsername, undefined, user.packageId, 'expired', user.mikrotikId);
        successCount++;
      } catch (e) {
        console.error(`Failed to sync ${user.pppoeUsername}:`, e.message);
      }
    }
  }
  
  console.log(`Successfully blocked ${successCount}/${expiredUsers.length} users on Mikrotik.`);
  process.exit(0);
}

fix();
