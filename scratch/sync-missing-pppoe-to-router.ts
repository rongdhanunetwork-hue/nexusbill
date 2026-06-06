import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getPppoeSecrets, createPppoeSecret } from '@/lib/mikrotik';

const RUN_DESTRUCTIVE = process.env.RUN_DESTRUCTIVE === 'true';

async function main() {
  try {
    console.log('Checking DB vs Router PPPoE secrets...');
    const customers = await db.query.users.findMany({ where: eq(users.role, 'customer') });
    const routerSecrets = await getPppoeSecrets();
    const existingNames = new Set((routerSecrets || []).map(s => String(s.name).toLowerCase()));

    const missing = customers.filter(c => c.pppoeUsername && !existingNames.has(c.pppoeUsername.toLowerCase().trim()));
    console.log('Total customers:', customers.length);
    console.log('Total PPPoE secrets on router:', routerSecrets.length);
    console.log('Customers missing on router:', missing.length);

    for (let i = 0; i < Math.min(50, missing.length); i++) {
      const c = missing[i];
      console.log(`  - id=${c.id} name=${c.name} username=${c.pppoeUsername} phone=${c.phone}`);
    }

    if (missing.length === 0) {
      console.log('Nothing to create.');
      process.exit(0);
    }

    if (!RUN_DESTRUCTIVE) {
      console.log('\nDry-run only. To create on router, set RUN_DESTRUCTIVE=true in env.');
      process.exit(0);
    }

    console.log('\nCreating missing PPPoE secrets on router...');
    let created = 0;
    for (const c of missing) {
      try {
        const pwd = String(c.pppoeUsername).slice(0, 45);
        await createPppoeSecret({ name: String(c.pppoeUsername), password: pwd, comment: `user_id=${c.id}` });
        created++;
        console.log(`  Created PPPoE for ${c.pppoeUsername} (user ${c.id})`);
      } catch (err) {
        console.error(`  Failed to create for ${c.pppoeUsername}:`, err);
      }
    }

    console.log(`\nDone. Created ${created} PPPoE secrets.`);
    process.exit(0);
  } catch (err) {
    console.error('Error during sync:', err);
    process.exit(1);
  }
}

main();
