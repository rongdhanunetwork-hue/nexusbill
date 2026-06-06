/**
 * Cleanup script: Remove duplicate customers by pppoeUsername
 * Keeps the record with the most complete data (non-null fields)
 * Run with: npx dotenv -e .env -- npx tsx scratch/cleanup-duplicates.ts
 */

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

async function main() {
  console.log("🔍 Finding duplicate customers by pppoeUsername...");

  // Get all customers
  const allCustomers = await db.query.users.findMany({
    where: eq(users.role, "customer"),
    columns: {
      id: true,
      name: true,
      phone: true,
      pppoeUsername: true,
      address: true,
      packageId: true,
      areaId: true,
      createdAt: true,
    }
  });

  // Group by pppoeUsername
  const grouped: Record<string, typeof allCustomers> = {};
  for (const c of allCustomers) {
    if (!c.pppoeUsername) continue;
    const key = c.pppoeUsername.toLowerCase().trim();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }

  // Find groups with duplicates
  const duplicateGroups = Object.entries(grouped).filter(([, group]) => group.length > 1);

  if (duplicateGroups.length === 0) {
    console.log("✅ No duplicates found!");
    return;
  }

  console.log(`⚠️  Found ${duplicateGroups.length} PPPoE usernames with duplicates:`);
  
  let totalDeleted = 0;

  for (const [username, group] of duplicateGroups) {
    // Sort: keep record with most filled fields (highest score)
    const scored = group.map(c => {
      let score = 0;
      if (c.name && c.name !== c.pppoeUsername) score += 2;
      if (c.phone && c.phone !== c.pppoeUsername) score += 2;
      if (c.address) score += 1;
      if (c.packageId) score += 1;
      if (c.areaId) score += 1;
      return { ...c, score };
    }).sort((a, b) => b.score - a.score || a.id - b.id);

    const keeper = scored[0];
    const toDelete = scored.slice(1);

    console.log(`\n📌 Username: ${username}`);
    console.log(`   ✅ Keeping ID: ${keeper.id} (name: ${keeper.name}, phone: ${keeper.phone}, score: ${keeper.score})`);
    
    for (const dup of toDelete) {
      console.log(`   🗑️  Deleting ID: ${dup.id} (name: ${dup.name}, phone: ${dup.phone}, score: ${dup.score})`);
      await db.delete(users).where(eq(users.id, dup.id));
      totalDeleted++;
    }
  }

  console.log(`\n✅ Done! Deleted ${totalDeleted} duplicate customer records.`);
}

main().catch(console.error).finally(() => process.exit());
