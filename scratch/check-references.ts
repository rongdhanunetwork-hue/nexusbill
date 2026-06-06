import { db } from "../src/db";
import { users, payments, invoices, dataUsage, tickets, ticketReplies, transactions, packageChangeRequests, auditLogs } from "../src/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";

async function main() {
  const today = new Date("2026-06-07T00:00:00+06:00");
  const customers = await db.select().from(users).where(
    and(
      eq(users.role, "customer"),
      gte(users.createdAt, today)
    )
  );

  // Identify the 598 customers to delete
  const group1 = customers.filter(c => {
    if (!c.pppoeUsername) return false;
    const u = c.pppoeUsername.toLowerCase().trim();
    const n = c.name.toLowerCase().trim();
    const p = c.phone.toLowerCase().trim();
    return (n === u || n === "") && (p === u || p.startsWith(u) || p === "");
  });

  const group2 = customers.filter(c => {
    if (!c.pppoeUsername) return true;
    const isNumericUsername = /^\d+$/.test(c.pppoeUsername.trim());
    const isShort = c.pppoeUsername.trim().length <= 6;
    const isNameDifferent = c.name.toLowerCase().trim() !== c.pppoeUsername.toLowerCase().trim();
    return (isNumericUsername && isShort && isNameDifferent) || c.pppoeUsername.trim() === "";
  });

  const toDelete = [...group1, ...group2];
  const deleteIds = toDelete.map(c => c.id);

  console.log(`Checking references for ${deleteIds.length} customers...`);

  if (deleteIds.length === 0) {
    console.log("No customers to delete.");
    return;
  }

  // Helper chunking for inArray queries in postgres to avoid query size limits (though 600 is small)
  const chunks = <T>(arr: T[], size: number): T[][] =>
    Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size)
    );

  let paymentsCount = 0;
  let invoicesCount = 0;
  let dataUsageCount = 0;
  let ticketsCount = 0;
  let repliesCount = 0;
  let transactionsCount = 0;
  let requestsCount = 0;
  let auditLogsCount = 0;

  for (const chunk of chunks(deleteIds, 100)) {
    const pay = await db.select().from(payments).where(inArray(payments.userId, chunk));
    paymentsCount += pay.length;

    const inv = await db.select().from(invoices).where(inArray(invoices.userId, chunk));
    invoicesCount += inv.length;

    const usage = await db.select().from(dataUsage).where(inArray(dataUsage.userId, chunk));
    dataUsageCount += usage.length;

    const tkt = await db.select().from(tickets).where(inArray(tickets.userId, chunk));
    ticketsCount += tkt.length;

    const rep = await db.select().from(ticketReplies).where(inArray(ticketReplies.userId, chunk));
    repliesCount += rep.length;

    const tx = await db.select().from(transactions).where(inArray(transactions.customerId, chunk));
    transactionsCount += tx.length;

    const req = await db.select().from(packageChangeRequests).where(inArray(packageChangeRequests.userId, chunk));
    requestsCount += req.length;

    const audit = await db.select().from(auditLogs).where(inArray(auditLogs.userId, chunk));
    auditLogsCount += audit.length;
  }

  console.log(`Referenced records found:`);
  console.log(`- Payments: ${paymentsCount}`);
  console.log(`- Invoices: ${invoicesCount}`);
  console.log(`- Data Usage: ${dataUsageCount}`);
  console.log(`- Tickets: ${ticketsCount}`);
  console.log(`- Ticket Replies: ${repliesCount}`);
  console.log(`- Transactions (as customer): ${transactionsCount}`);
  console.log(`- Package Change Requests: ${requestsCount}`);
  console.log(`- Audit Logs: ${auditLogsCount}`);
}

main().catch(console.error).finally(() => process.exit());
