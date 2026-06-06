import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq, and, gte } from "drizzle-orm";

async function main() {
  const today = new Date("2026-06-07T00:00:00+06:00");
  const customers = await db.select().from(users).where(
    and(
      eq(users.role, "customer"),
      gte(users.createdAt, today)
    )
  );

  console.log(`Total customers created today (2026-06-07): ${customers.length}`);

  // Let's filter Group 1: Username exists, but Name & Phone are identical/dummy to username
  // (e.g. name = username, phone starts with username)
  const group1 = customers.filter(c => {
    if (!c.pppoeUsername) return false;
    const u = c.pppoeUsername.toLowerCase().trim();
    const n = c.name.toLowerCase().trim();
    const p = c.phone.toLowerCase().trim();
    
    const isNameDummy = n === u || n === "";
    const isPhoneDummy = p === u || p.startsWith(u) || p === "";
    
    return isNameDummy && isPhoneDummy;
  });

  // Let's filter Group 2: Has name & mobile, but username is numeric dummy (matching row id)
  const group2 = customers.filter(c => {
    if (!c.pppoeUsername) return true; // no username at all
    
    // Check if username is a pure integer number
    const isNumericUsername = /^\d+$/.test(c.pppoeUsername.trim());
    
    // If username is numeric, check if name is NOT equal to username (meaning they have a real name, but numeric username)
    // Wait, also check if username is a dummy string like "test", "pending", etc.
    const isNameDifferent = c.name.toLowerCase().trim() !== c.pppoeUsername.toLowerCase().trim();
    
    return (isNumericUsername && isNameDifferent) || c.pppoeUsername.trim() === "";
  });

  // Keep list (not matched by Group 1 or Group 2)
  const keepList = customers.filter(c => !group1.includes(c) && !group2.includes(c));

  console.log(`\n--- GROUP 1: No Name/Mobile (only Username) ---`);
  console.log(`Count: ${group1.length}`);
  group1.slice(0, 10).forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}" | Created: ${c.createdAt}`);
  });

  console.log(`\n--- GROUP 2: Has Name & Mobile, but Username is dummy number ---`);
  console.log(`Count: ${group2.length}`);
  group2.slice(0, 10).forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}" | Created: ${c.createdAt}`);
  });

  console.log(`\n--- KEEP LIST (Customers created today that we will NOT delete) ---`);
  console.log(`Count: ${keepList.length}`);
  keepList.forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}" | Created: ${c.createdAt}`);
  });
}

main().catch(console.error).finally(() => process.exit());
