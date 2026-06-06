import { db } from "../src/db";
import { users } from "../src/db/schema";
import { lt } from "drizzle-orm";

async function main() {
  const today = new Date("2026-06-07T00:00:00+06:00");
  const oldUsers = await db.select().from(users).where(lt(users.createdAt, today));
  console.log(`Users created before today: ${oldUsers.length}`);
  oldUsers.forEach(u => {
    console.log(`ID: ${u.id} | Name: "${u.name}" | Phone: "${u.phone}" | Username: "${u.pppoeUsername}" | Role: "${u.role}" | Created: ${u.createdAt}`);
  });
}

main().catch(console.error).finally(() => process.exit());
