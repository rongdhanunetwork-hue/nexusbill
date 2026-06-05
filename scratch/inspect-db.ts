import { db } from "../src/db";
import { settings, smsLogs } from "../src/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  console.log("--- SMS SETTINGS ---");
  const allSettings = await db.select().from(settings);
  console.log(JSON.stringify(allSettings, null, 2));

  console.log("\n--- RECENT SMS LOGS ---");
  const logs = await db.select().from(smsLogs).orderBy(desc(smsLogs.id)).limit(10);
  console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error);
