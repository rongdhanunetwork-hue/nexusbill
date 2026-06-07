import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Inspecting duplicates for '1247'...");
    const rows = await db.execute(sql`
      SELECT id, name, phone, role, pppoe_username, created_at, status 
      FROM users 
      WHERE pppoe_username = '1247'
    `);
    console.log(rows.rows);

    console.log("\nInspecting duplicates for 'RDN-VEDVEDI-1002'...");
    const rows2 = await db.execute(sql`
      SELECT id, name, phone, role, pppoe_username, created_at, status 
      FROM users 
      WHERE pppoe_username = 'RDN-VEDVEDI-1002'
    `);
    console.log(rows2.rows);
  } catch (err) {
    console.error(err);
  }
}

main().then(() => process.exit(0)).catch(console.error);
