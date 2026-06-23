import { db } from "../src/db/index.js";
import { dataUsage } from "../src/db/schema.js";
import { sql } from "drizzle-orm";

async function run() {
  await db.update(dataUsage).set({
    downloadGb: sql`${dataUsage.downloadGb} / 100`,
    uploadGb: sql`${dataUsage.uploadGb} / 100`
  });
  console.log("Updated dataUsage numbers.");
  process.exit(0);
}
run();
