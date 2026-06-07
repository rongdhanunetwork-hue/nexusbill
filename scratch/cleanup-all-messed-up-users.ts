import { db } from "../src/db";
import { users, payments, invoices, dataUsage, transactions } from "../src/db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";

const RUN_DESTRUCTIVE = process.env.RUN_DESTRUCTIVE === 'true';

async function main() {
  console.log(`=== CUSTOMER DATABASE CLEANUP SYSTEM ===`);
  console.log(`Mode: ${RUN_DESTRUCTIVE ? "DESTRUCTIVE (Will Delete)" : "DRY RUN (No changes made)"}`);

  // Fetch all customers in the system
  const customers = await db.select().from(users).where(eq(users.role, "customer"));
  console.log(`Total customers in database: ${customers.length}`);

  // Category 1: No name or real mobile number (only username is present or replicated in fields)
  const group1 = customers.filter(c => {
    if (!c.pppoeUsername) return false;
    const u = c.pppoeUsername.toLowerCase().trim();
    const n = c.name.toLowerCase().trim();
    const p = (c.phone || "").toLowerCase().trim();
    
    // Checks if name is dummy or empty
    const isNameDummy = n === u || n === "" || n === "unknown";
    
    // Checks if phone is dummy, empty, matches username, or is not a real phone number
    const isPhoneDummy = p === u || p.startsWith(u) || p === "" || p === "unknown" || !/^\+?\d{5,15}$/.test(p);
    
    return isNameDummy && isPhoneDummy;
  });

  // Category 2: Has name or mobile, but no valid PPPoE Username
  const group2 = customers.filter(c => {
    const username = (c.pppoeUsername || "").trim();
    if (!username) return true; // Username is completely missing
    
    // Check if username is just a dummy numeric string (like an auto-generated row number)
    const isNumericUsername = /^\d+$/.test(username);
    const isShortDummy = isNumericUsername && username.length <= 6;
    
    return isShortDummy;
  });

  const toDelete = [...new Set([...group1, ...group2])];
  const deleteIds = toDelete.map(c => c.id);

  console.log(`\nFound ${toDelete.length} invalid customers in total:`);
  console.log(`- Category 1 (No name/mobile, only Username): ${group1.length}`);
  console.log(`- Category 2 (Name/mobile exist, but Username is missing/dummy number): ${group2.length}`);

  if (toDelete.length === 0) {
    console.log("\nNo invalid customer records found in the database.");
    return;
  }

  // Display samples
  if (group1.length > 0) {
    console.log(`\nSample Category 1 candidates (first 10):`);
    group1.slice(0, 10).forEach(c => {
      console.log(`  - ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}" | Created: ${c.createdAt}`);
    });
  }

  if (group2.length > 0) {
    console.log(`\nSample Category 2 candidates (first 10):`);
    group2.slice(0, 10).forEach(c => {
      console.log(`  - ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}" | Created: ${c.createdAt}`);
    });
  }

  if (RUN_DESTRUCTIVE) {
    console.log(`\n⚠️ DELETING RELATED RECORDS AND ${toDelete.length} INVALID CUSTOMERS...`);
    
    // Chunk deletions to prevent database lockups or payload size limits
    const chunks = <T>(arr: T[], size: number): T[][] =>
      Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
      );

    let deletedUsersCount = 0;
    
    for (const chunk of chunks(deleteIds, 100)) {
      // 1. Delete dependent usage records
      await db.delete(dataUsage).where(inArray(dataUsage.userId, chunk));

      // 2. Delete dependent payment records
      await db.delete(payments).where(inArray(payments.userId, chunk));

      // 3. Delete dependent invoices
      await db.delete(invoices).where(inArray(invoices.userId, chunk));

      // 4. Delete dependent transactions
      await db.delete(transactions).where(inArray(transactions.customerId, chunk));

      // 5. Delete from users table
      await db.delete(users).where(inArray(users.id, chunk));
      deletedUsersCount += chunk.length;
    }
    
    console.log(`\n✅ Success! Deleted ${deletedUsersCount} invalid customer accounts.`);
  } else {
    console.log(`\nℹ️ DRY RUN COMPLETE. To delete these records, run the script with RUN_DESTRUCTIVE=true`);
  }
}

main().catch(console.error).finally(() => process.exit());
