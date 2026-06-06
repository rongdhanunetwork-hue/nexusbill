import 'dotenv/config';
import { db } from '@/db';
import { users, mikrotiks } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getPppoeActive } from '@/lib/mikrotik';

async function run() {
  const adminId = 1;
  console.log('Diagnosing active status for adminId=', adminId);

  const allDbCustomers = await db.query.users.findMany({
    where: and(eq(users.role, 'customer'), eq(users.adminId, adminId), isNull(users.resellerId)),
    columns: { id: true, name: true, pppoeUsername: true, status: true }
  });

  const routers = await db.select().from(mikrotiks).where(and(isNull(mikrotiks.resellerId), eq(mikrotiks.status, true), eq(mikrotiks.adminId, adminId)));

  console.log('Total customers fetched:', allDbCustomers.length);
  console.log('Routers to query:', routers.length);

  const activeSessionsLists = await Promise.all(routers.map(r => getPppoeActive((r as any).id).catch(e => { console.error('router error', (r as any).id, e.message || e); return []; })));

  // include default router
  activeSessionsLists.push(await getPppoeActive(undefined).catch(e => { console.error('default router error', e); return []; }));

  const activePppoeNames = new Set<string>();
  for (const list of activeSessionsLists) {
    for (const s of list) {
      if (s && s.name) activePppoeNames.add(s.name.toLowerCase());
    }
  }

  const activeCustomers = allDbCustomers.filter(c => c.status === 'active' || c.status === 'online');
  const online = activeCustomers.filter(c => c.pppoeUsername && activePppoeNames.has(c.pppoeUsername.toLowerCase()));
  const offline = activeCustomers.filter(c => !(c.pppoeUsername && activePppoeNames.has(c.pppoeUsername.toLowerCase())));

  console.log('Active customers total:', activeCustomers.length);
  console.log('Online (matched by PPPoE username):', online.length);
  console.log('Offline (active but not in router sessions):', offline.length);
  console.log('Customers missing PPPoE username:', allDbCustomers.filter(c => !c.pppoeUsername).length);

  console.log('\nSample online customers:');
  online.slice(0,10).forEach(c => console.log(c.id, c.name, c.pppoeUsername));

  console.log('\nSample offline customers:');
  offline.slice(0,10).forEach(c => console.log(c.id, c.name, c.pppoeUsername));

  process.exit(0);
}

run().catch(err => { console.error('diagnose error', err); process.exit(2); });
