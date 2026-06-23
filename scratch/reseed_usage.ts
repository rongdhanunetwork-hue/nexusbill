import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/db/index.js';
import { dataUsage } from '../src/db/schema.js';

async function run() {
  console.log('Re-seeding dataUsage...');
  await db.delete(dataUsage);
  const allUsers = await db.query.users.findMany({ limit: 50 });
  
  if (allUsers.length === 0) {
    console.log('No users found.');
    return;
  }

  for (let i = 0; i < 70; i++) {
    const user = allUsers[i % allUsers.length];
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 7));
    await db.insert(dataUsage).values({
      userId: user.id,
      downloadGb: String((Math.random() * 5 + 1).toFixed(2)),
      uploadGb: String((Math.random() * 2 + 0.5).toFixed(2)),
      recordedAt: pastDate
    });
  }
  console.log('Done!');
  process.exit(0);
}

run();
