import { db } from "../src/db";
import { users, payments, invoices, dataUsage, transactions } from "../src/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";

const RUN_DESTRUCTIVE = process.env.RUN_DESTRUCTIVE === 'true';

async function main() {
  console.log(`Cleanup Mode: ${RUN_DESTRUCTIVE ? "DESTRUCTIVE (Will Delete)" : "DRY RUN (No changes made)"}`);

  const today = new Date("2026-06-07T00:00:00+06:00");
  const customers = await db.select().from(users).where(
    and(
      eq(users.role, "customer"),
      gte(users.createdAt, today)
    )
  );

  console.log(`Total customers created today: ${customers.length}`);

  // Category 1: Name and Phone are identical/derived from PPPoE Username
  const group1 = customers.filter(c => {
    if (!c.pppoeUsername) return false;
    const u = c.pppoeUsername.toLowerCase().trim();
    const n = c.name.toLowerCase().trim();
    const p = c.phone.toLowerCase().trim();
    
    const isNameDummy = n === u || n === "";
    const isPhoneDummy = p === u || p.startsWith(u) || p === "";
    
    return isNameDummy && isPhoneDummy;
  });

  // Category 2: Username is numeric row ID (length <= 6) and has a real-looking name
  const group2 = customers.filter(c => {
    if (!c.pppoeUsername) return true;
    const isNumericUsername = /^\d+$/.test(c.pppoeUsername.trim());
    const isShort = c.pppoeUsername.trim().length <= 6;
    const isNameDifferent = c.name.toLowerCase().trim() !== c.pppoeUsername.toLowerCase().trim();
    return (isNumericUsername && isShort && isNameDifferent) || c.pppoeUsername.trim() === "";
  });

  const toDelete = [...group1, ...group2];
  const deleteIds = toDelete.map(c => c.id);

  console.log(`\nFound ${toDelete.length} customers matching cleanup criteria:`);
  console.log(`- Category 1 (No name/mobile, only Username): ${group1.length}`);
  console.log(`- Category 2 (Name/mobile exist, but Username is dummy number): ${group2.length}`);

  if (toDelete.length === 0) {
    console.log("No records to clean up.");
    return;
  }

  // List first 5 candidates of Category 1
  console.log(`\nSample Category 1 (first 5):`);
  group1.slice(0, 5).forEach(c => {
    console.log(`  - ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}"`);
  });

  // List first 5 candidates of Category 2
  console.log(`\nSample Category 2 (first 5):`);
  group2.slice(0, 5).forEach(c => {
    console.log(`  - ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}"`);
  });

  if (RUN_DESTRUCTIVE) {
    console.log(`\n⚠️ DELETING RELATED RECORDS AND ${toDelete.length} USERS FROM DATABASE...`);
    
    // Chunk deletions to be safe
    const chunks = <T>(arr: T[], size: number): T[][] =>
      Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
      );

    let deletedUsersCount = 0;
    let deletedUsageCount = 0;
    let deletedPaymentsCount = 0;
    let deletedInvoicesCount = 0;
    let deletedTransactionsCount = 0;

    for (const chunk of chunks(deleteIds, 100)) {
      // 1. Delete from data_usage
      const usageRes = await db.delete(dataUsage).where(inArray(dataUsage.userId, chunk));
      deletedUsageCount += chunk.length; // Approximate, or count deleted

      // 2. Delete from payments
      await db.delete(payments).where(inArray(payments.userId, chunk));

      // 3. Delete from invoices
      await db.delete(invoices).where(inArray(invoices.userId, chunk));

      // 4. Delete from transactions
      await db.delete(transactions).where(inArray(transactions.customerId, chunk));

      // 5. Delete from users
      await db.delete(users).where(inArray(users.id, chunk));
      deletedUsersCount += chunk.length;
    }
    
    console.log(`\n✅ Successfully deleted referencing records and ${deletedUsersCount} users.`);
  } else {
    console.log(`\nℹ️ This was a dry run. To perform the actual deletion, run the script with RUN_DESTRUCTIVE=true`);
  }
}

main().catch(console.error).finally(() => process.exit());
