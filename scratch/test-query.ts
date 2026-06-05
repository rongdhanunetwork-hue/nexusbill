import { db } from "../src/db";
import { settings } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

async function main() {
  console.log("Querying settings key=sms_provider, adminId=1...");
  try {
    const row = await db.query.settings.findFirst({
      where: and(eq(settings.key, "sms_provider"), eq(settings.adminId, 1))
    });
    console.log("Row found:", row);
  } catch (err) {
    console.error("Query failed with error:", err);
  }
}

main().then(() => process.exit(0)).catch(console.error);
