import { db } from "@/db";
import { users, payments, invoices, dataUsage, tickets, ticketReplies, packageChangeRequests, withdrawalRequests, transactions } from "@/db/schema";

// This script finds duplicate users by exact name match (case-insensitive),
// selects a keeper per group, and in destructive mode reassigns related records
// (payments, invoices, data_usage, tickets, ticket_replies, package_change_requests, transactions)
// from duplicates to the keeper, then deletes duplicate user records.

const RUN_DESTRUCTIVE = process.env.RUN_DESTRUCTIVE === 'true';

function scoreUser(u: any) {
  let s = 0;
  if (u.pppoeUsername) s += 4;
  if (u.packageId) s += 3;
  if (u.phone && u.phone.length > 3 && !/^[0-9]+$/.test(u.phone)) s += 1;
  return s;
}

async function main() {
  try {
    const all = await db.query.users.findMany({});
    const map = new Map<string, any[]>();
    for (const u of all) {
      const n = (u.name || '').toLowerCase().trim();
      if (!n) continue;
      if (!map.has(n)) map.set(n, []);
      map.get(n)!.push(u);
    }

    const groups = Array.from(map.entries()).filter(([k, v]) => v.length > 1);
    if (groups.length === 0) {
      console.log('No duplicate-name groups found.');
      process.exit(0);
    }

    console.log(`Found ${groups.length} duplicate name groups. Processing...`);

    for (const [name, group] of groups) {
      console.log('\nGroup:', name, 'count=', group.length);
      group.sort((a,b) => (a.createdAt?.getTime?.() || 0) - (b.createdAt?.getTime?.() || 0));
      // choose keeper by highest score, then earliest created
      let keeper = group[0];
      let bestScore = -1;
      for (const u of group) {
        const s = scoreUser(u);
        if (s > bestScore || (s === bestScore && (u.createdAt || 0) < (keeper.createdAt || 0))) {
          bestScore = s;
          keeper = u;
        }
      }

      console.log('keeper ->', keeper.id, keeper.name, 'pppoe=', keeper.pppoeUsername, 'phone=', keeper.phone);
      const duplicates = group.filter(u => u.id !== keeper.id);
      for (const dup of duplicates) {
        console.log(' duplicate ->', dup.id, dup.name, 'pppoe=', dup.pppoeUsername, 'phone=', dup.phone);
      }

      if (!RUN_DESTRUCTIVE) {
        console.log('  (dry-run) reassign payments/invoices/dataUsage/tickets/transactions from duplicates to keeper');
        continue;
      }

      // Reassign related records
      for (const dup of duplicates) {
        // payments
        await db.update(payments).set({ userId: keeper.id }).where(payments.userId.eq(dup.id));
        // invoices
        await db.update(invoices).set({ userId: keeper.id }).where(invoices.userId.eq(dup.id));
        // data_usage
        await db.update(dataUsage).set({ userId: keeper.id }).where(dataUsage.userId.eq(dup.id));
        // tickets
        await db.update(tickets).set({ userId: keeper.id }).where(tickets.userId.eq(dup.id));
        // ticket replies
        await db.update(ticketReplies).set({ userId: keeper.id }).where(ticketReplies.userId.eq(dup.id));
        // package change requests
        await db.update(packageChangeRequests).set({ userId: keeper.id }).where(packageChangeRequests.userId.eq(dup.id));
        // transactions: customerId
        await db.update(transactions).set({ customerId: keeper.id }).where(transactions.customerId.eq(dup.id));

        // Finally delete the duplicate user
        await db.delete(users).where(users.id.eq(dup.id));
        console.log(`  Deleted duplicate user ${dup.id}`);
      }

      console.log(`  Completed group ${name}`);
    }

    console.log('\nAll groups processed.');
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

main();
