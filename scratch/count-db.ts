import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const res = await db.execute(sql`
      SELECT role, COUNT(*), COUNT(DISTINCT pppoe_username) as unique_pppoe
      FROM users 
      GROUP BY role
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
}

main().then(() => process.exit(0)).catch(console.error);
