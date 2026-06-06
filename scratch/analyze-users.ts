import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Analyzing users in the database...");
  const dbUsers = await db.select().from(users);
  
  // Filter for customers
  const customers = dbUsers.filter(u => u.role === "customer");
  console.log(`Total customers found: ${customers.length}`);

  console.log("\n--- Category 1: Customers without PPPoE Username ---");
  const noUsername = customers.filter(c => !c.pppoeUsername || c.pppoeUsername.trim() === "");
  console.log(`Count: ${noUsername.length}`);
  noUsername.forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}" | Created: ${c.createdAt}`);
  });

  console.log("\n--- Category 2: Customers with Username but missing/dummy Name or Phone ---");
  const missingOrDummyInfo = customers.filter(c => {
    if (!c.pppoeUsername || c.pppoeUsername.trim() === "") return false;
    
    // Check if name is dummy (e.g., empty, same as username, or placeholder like "N/A", "Unknown", etc.)
    const nameLower = c.name.toLowerCase().trim();
    const usernameLower = c.pppoeUsername.toLowerCase().trim();
    const phoneTrim = c.phone.trim();
    
    const isNameDummy = !c.name || nameLower === "" || nameLower === usernameLower || nameLower === "unknown" || nameLower === "n/a" || nameLower === "no name";
    
    // Check if phone is dummy (e.g., empty, same as username, too short, or all zeros, or placeholder)
    const isPhoneDummy = !c.phone || phoneTrim === "" || phoneTrim === usernameLower || phoneTrim.length < 5 || /^[0]+$/.test(phoneTrim) || phoneTrim === "0" || phoneTrim === "unknown";
    
    return isNameDummy || isPhoneDummy;
  });

  console.log(`Count: ${missingOrDummyInfo.length}`);
  missingOrDummyInfo.forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}" | Created: ${c.createdAt}`);
  });

  console.log("\n--- Sample of valid-looking Customers (first 10) ---");
  const validCustomers = customers.filter(c => !noUsername.includes(c) && !missingOrDummyInfo.includes(c));
  console.log(`Count: ${validCustomers.length}`);
  validCustomers.slice(0, 10).forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}" | Created: ${c.createdAt}`);
  });
}

main().catch(console.error).finally(() => process.exit());
