import { db } from '@/db';

async function main() {
  const all = await db.query.users.findMany({});
  const missing = all.filter(u => !u.pppoeUsername && u.role === 'customer');
  console.log('Total users:', all.length);
  console.log('Customers missing pppoeUsername:', missing.length);
  console.log('Sample missing IDs (first 20):', missing.slice(0,20).map(u => ({ id: u.id, name: u.name, phone: u.phone })));
  process.exit(0);
}

main();
