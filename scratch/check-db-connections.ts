import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("--- PG STAT ACTIVITY ---");
  const result = await db.execute(sql`
    SELECT pid, usename, client_addr, backend_start, query, state 
    FROM pg_stat_activity 
    WHERE datname = 'nexusbill_db' AND pid <> pg_backend_pid()
  `);
  console.log(JSON.stringify(result.rows, null, 2));
}

main().catch(console.error).finally(() => process.exit());
