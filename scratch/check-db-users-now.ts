import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq, and, like } from "drizzle-orm";

async function main() {
  console.log("=== Current Database Inspection ===");
  
  // Total customers
  const customers = await db.select().from(users).where(eq(users.role, "customer"));
  console.log(`Total customers in database: ${customers.length}`);
  
  // Count numeric-only usernames
  const numericUsers = customers.filter(c => /^\d+$/.test(c.pppoeUsername || ""));
  console.log(`Customers with numeric usernames: ${numericUsers.length}`);
  
  // Print first 20 numeric usernames
  console.log("\nSample numeric usernames:");
  numericUsers.slice(0, 20).forEach(c => {
    console.log(`  - ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}" | Created: ${c.createdAt}`);
  });
}

main().catch(console.error).finally(() => process.exit());
