import { db } from "../src/db";
import { mikrotiks } from "../src/db/schema";

async function main() {
  console.log("--- MIKROTIK ROUTERS IN DB ---");
  const routers = await db.select().from(mikrotiks);
  console.log(JSON.stringify(routers, null, 2));
}

main().catch(console.error);
