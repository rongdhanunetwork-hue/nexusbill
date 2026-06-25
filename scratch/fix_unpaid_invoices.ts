import { db } from "../src/db/index.js";
import { users, invoices } from "../src/db/schema.js";
import { eq, and, gt, sql } from "drizzle-orm";

async function fixUnpaidInvoices() {
  console.log("Starting data cleanup for Unpaid invoices...");
  const now = new Date();

  // Find all customers who are currently active and their expire date is in the future
  const activeCustomers = await db.query.users.findMany({
    where: and(
      eq(users.role, "customer"),
      eq(users.status, "active"),
      gt(users.expireDate, now)
    )
  });

  let fixedCount = 0;

  for (const customer of activeCustomers) {
    // Check if they have any unpaid/due invoices
    const dueInvoices = await db.query.invoices.findMany({
      where: sql`${invoices.userId} = ${customer.id} and ${invoices.status} in ('unpaid', 'due')`
    });

    if (dueInvoices.length > 0) {
      console.log(`Fixing customer: ${customer.name} (ID: ${customer.id}). Found ${dueInvoices.length} unpaid invoices.`);
      
      // Update them to paid
      await db.update(invoices)
        .set({ status: "paid" })
        .where(sql`${invoices.userId} = ${customer.id} and ${invoices.status} in ('unpaid', 'due')`);
        
      fixedCount++;
    }
  }

  console.log(`\nCleanup complete! Fixed unpaid invoices for ${fixedCount} active customers.`);
  process.exit(0);
}

fixUnpaidInvoices().catch(console.error);
