import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/db/index.js';
import { users, payments, invoices, dataUsage } from '../src/db/schema.js';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('Seeding dummy data...');
  const allUsers = await db.select().from(users).limit(50);
  if (allUsers.length === 0) {
    console.log('No users found.');
    return;
  }
  
  // Seed past 6 months of payments and invoices to populate the Monthly Income Graph
  for (let i = 0; i < 150; i++) {
    const user = allUsers[i % allUsers.length];
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 180)); // past 6 months
    await db.insert(payments).values({
      userId: user.id,
      amount: String(Math.floor(Math.random() * 500) + 500), // 500-1000
      method: 'cash',
      status: 'approved',
      createdAt: pastDate
    });
    await db.insert(invoices).values({
      userId: user.id,
      amount: String(Math.floor(Math.random() * 500) + 500),
      status: 'paid',
      createdAt: pastDate,
      dueDate: pastDate
    });
  }

  // Seed last 7 days of data usage for the Daily Usage Graph
  for (let i = 0; i < 70; i++) {
    const user = allUsers[i % allUsers.length];
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 7)); // past 7 days
    await db.insert(dataUsage).values({
      userId: user.id,
      downloadGb: String((Math.random() * 100).toFixed(2)),
      uploadGb: String((Math.random() * 50).toFixed(2)),
      recordedAt: pastDate
    });
  }
  
  console.log('Done seeding!');
  process.exit(0);
}

run();
