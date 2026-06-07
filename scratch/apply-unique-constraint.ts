import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Checking for any duplicate pppoe_username values (excluding null/empty)...");
    const duplicates = await db.execute(sql`
      SELECT pppoe_username, COUNT(*) 
      FROM users 
      WHERE pppoe_username IS NOT NULL AND pppoe_username != ''
      GROUP BY pppoe_username 
      HAVING COUNT(*) > 1
    `);

    if (duplicates.rows.length > 0) {
      console.error("⚠️ Cannot apply unique constraint. Duplicate PPPoE usernames exist in DB:", duplicates.rows);
      process.exit(1);
    }

    console.log("No duplicates found. Applying UNIQUE constraint to pppoe_username column...");
    await db.execute(sql`
      ALTER TABLE users 
      ADD CONSTRAINT users_pppoe_username_unique UNIQUE (pppoe_username);
    `);
    console.log("✅ UNIQUE constraint added successfully!");
  } catch (err) {
    console.error("❌ Failed to add constraint:", err);
  }
}

main().then(() => process.exit(0)).catch(console.error);
