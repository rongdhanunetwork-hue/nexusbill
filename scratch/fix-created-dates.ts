/**
 * Fix imported customers' createdAt dates.
 * Customers that were imported today but were already on MikroTik
 * should have their createdAt set to joiningDate or a reasonable past date.
 * 
 * Run with: npx dotenv -e .env -- npx tsx scratch/fix-created-dates.ts
 */

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

async function main() {
  console.log("🔍 Finding customers with today's createdAt (from bulk import)...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all customers created today
  const todayCustomers = await db.query.users.findMany({
    where: and(
      eq(users.role, "customer"),
      sql`${users.createdAt} >= ${today.toISOString()}::timestamp`
    ),
    columns: {
      id: true,
      name: true,
      pppoeUsername: true,
      createdAt: true,
      joiningDate: true,
    }
  });

  if (todayCustomers.length === 0) {
    console.log("✅ No customers found with today's createdAt.");
    return;
  }

  console.log(`Found ${todayCustomers.length} customers created today.`);

  // For bulk-imported customers, set createdAt to 30 days ago (reasonable default)
  // This prevents them from all showing as "New This Month"
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let fixedCount = 0;

  for (const c of todayCustomers) {
    // Use joiningDate if available, otherwise 30 days ago
    const newDate = c.joiningDate || thirtyDaysAgo;
    
    await db.update(users)
      .set({ createdAt: newDate })
      .where(eq(users.id, c.id));
    
    fixedCount++;
  }

  console.log(`✅ Fixed ${fixedCount} customers' createdAt to a past date.`);
  console.log("Dashboard 'Running Month New User' count will now be accurate.");
}

main().catch(console.error).finally(() => process.exit());
