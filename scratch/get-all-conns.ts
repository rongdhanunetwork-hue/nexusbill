import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("--- PG STAT CONNECTIONS COUNT ---");
  const result = await db.execute(sql`
    SELECT client_addr, count(*), array_agg(pid) as pids
    FROM pg_stat_activity 
    GROUP BY client_addr
  `);
  console.log(JSON.stringify(result.rows, null, 2));
}

main().catch(console.error).finally(() => process.exit());
