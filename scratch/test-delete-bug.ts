import { db } from "../src/db";
import { users } from "../src/db/schema";
import bcrypt from "bcryptjs";

async function main() {
  const pppoeUsername = "TEST-BUG-ID-999";
  const password = await bcrypt.hash("123456", 10);

  console.log(`Creating 2 dummy customers with the exact same PPPoE Username: ${pppoeUsername}`);

  // Insert First Customer
  const [customer1] = await db.insert(users).values({
    name: "Test Customer 1 (Active)",
    phone: "01999999991",
    password,
    pppoeUsername,
    role: "customer",
    status: "active",
    adminId: 1, // Assuming admin ID 1
  }).returning();
  console.log(`Created Customer 1 with ID: ${customer1.id}`);

  // Insert Second Customer (Duplicate)
  const [customer2] = await db.insert(users).values({
    name: "Test Customer 2 (Old/Duplicate)",
    phone: "01999999992",
    password,
    pppoeUsername,
    role: "customer",
    status: "expired",
    adminId: 1,
  }).returning();
  console.log(`Created Customer 2 with ID: ${customer2.id}`);

  console.log("\n✅ Test data created successfully!");
  console.log("--- HOW TO TEST ---");
  console.log(`1. Go to your Admin Panel -> Customers.`);
  console.log(`2. Search for "${pppoeUsername}". You will see one of the test customers.`);
  console.log(`3. Delete that customer from the UI.`);
  console.log(`4. Look at your VS Code terminal running 'npm run dev'.`);
  console.log(`5. You should see this log message:`);
  console.log(`   "[Safety Check] Skipping MikroTik secret deletion for \\"${pppoeUsername}\\". Reason: ID is still in use by other active customers in the database."`);
  console.log(`6. Search for "${pppoeUsername}" in the panel again. You will see the other duplicate is still safe!`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
