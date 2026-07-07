import { db } from './src/db';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const user = await db.query.users.findFirst({where: eq(users.pppoeUsername, 'RDN-AMANAT-1003')});
  console.log('IKRAMARMY:', {
    status: user?.status,
    expireDate: user?.expireDate,
    now: new Date(),
    isLessThanNow: user?.expireDate ? user.expireDate < new Date() : false
  });
  process.exit(0);
}

main();
