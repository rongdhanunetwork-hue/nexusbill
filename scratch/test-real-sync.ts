import 'dotenv/config';
import { syncCustomerToMikrotik } from '../src/lib/sync';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const username = 'RDN-MOJIB-1018'; // Test user
  console.log(`Running real sync simulation for PPPoE Username: ${username}...`);

  const customer = await db.query.users.findFirst({
    where: eq(users.pppoeUsername, username),
  });

  if (!customer) {
    console.error(`Customer ${username} not found in DB.`);
    process.exit(1);
  }

  console.log(`Customer found: ${customer.name}, Current packageId: ${customer.packageId}, Status: ${customer.status}`);

  // Perform sync with package ID = 5
  console.log("Calling syncCustomerToMikrotik with packageId = 5 (10 Mbps)...");
  await syncCustomerToMikrotik(username, undefined, 5, 'active', customer.mikrotikId);
  console.log("Sync complete!");

  process.exit(0);
}

main().catch(console.error);
