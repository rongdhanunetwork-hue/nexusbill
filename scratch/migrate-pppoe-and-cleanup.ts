import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";

/**
 * ===== MIGRATION & CLEANUP SCRIPT =====
 * 
 * This script:
 * 1. Fills missing pppoeUsername for customers (from phone if needed)
 * 2. Removes duplicate customers with identical pppoeUsername (keeps the latest)
 * 3. Logs all changes made
 * 
 * Run: npx tsx scratch/migrate-pppoe-and-cleanup.ts
 */

async function main() {
  console.log("🔄 Starting PPPoE migration & duplicate cleanup...\n");

  try {
    // ─── Step 1: Migrate empty pppoeUsername ───
    console.log("📋 Step 1: Filling missing PPPoE usernames...");
    const customersWithoutPppoe = await db.query.users.findMany({
      where: and(eq(users.role, "customer"), isNull(users.pppoeUsername))
    });

    let migratedCount = 0;
    for (const customer of customersWithoutPppoe) {
      const fallbackUsername = customer.phone || `cust_${customer.id}`;
      await db.update(users)
        .set({ pppoeUsername: fallbackUsername })
        .where(eq(users.id, customer.id));
      migratedCount++;
    }
    console.log(`✅ Migrated ${migratedCount} customers with missing PPPoE username\n`);

    // ─── Step 2: Remove duplicate customers ───
    console.log("🧹 Step 2: Removing duplicate customers...");
    const allCustomers = await db.query.users.findMany({
      where: eq(users.role, "customer")
    });

    const pppoeMap = new Map<string, (typeof allCustomers)[0][]>();
    for (const u of allCustomers) {
      if (u.pppoeUsername) {
        const key = u.pppoeUsername.toLowerCase().trim();
        if (!pppoeMap.has(key)) pppoeMap.set(key, []);
        pppoeMap.get(key)!.push(u);
      }
    }

    let deletedCount = 0;
    const deletedCustomers: { id: number; name: string; pppoeUsername: string }[] = [];

    for (const [key, dupes] of pppoeMap) {
      if (dupes.length > 1) {
        // Sort by updatedAt DESC, keep the most recently updated
        dupes.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        const keep = dupes[0];

        for (let i = 1; i < dupes.length; i++) {
          const duplicate = dupes[i];
          await db.delete(users).where(eq(users.id, duplicate.id));
          deletedCount++;
          deletedCustomers.push({
            id: duplicate.id,
            name: duplicate.name,
            pppoeUsername: duplicate.pppoeUsername || "N/A"
          });
        }
        console.log(`  🗑️  Removed ${dupes.length - 1} duplicates for PPPoE: ${key} (kept ID: ${keep.id})`);
      }
    }
    console.log(`\n✅ Removed ${deletedCount} duplicate customers\n`);

    if (deletedCustomers.length > 0) {
      console.log("📝 Deleted customer details:");
      deletedCustomers.forEach(c => {
        console.log(`   - ID: ${c.id}, Name: ${c.name}, PPPoE: ${c.pppoeUsername}`);
      });
      console.log();
    }

    // ─── Summary ───
    console.log("╔════════════════════════════════════════╗");
    console.log("║  ✨ MIGRATION & CLEANUP COMPLETE      ║");
    console.log("╠════════════════════════════════════════╣");
    console.log(`║ PPPoE Usernames Migrated: ${migratedCount.toString().padEnd(20)}║`);
    console.log(`║ Duplicate Customers Deleted: ${deletedCount.toString().padEnd(16)}║`);
    console.log("╚════════════════════════════════════════╝\n");

  } catch (err) {
    console.error("❌ Error during migration:", err);
    process.exit(1);
  }
}

main();
