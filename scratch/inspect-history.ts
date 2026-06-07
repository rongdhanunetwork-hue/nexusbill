import { db } from "../src/db";
import { mikrotiks, auditLogs, users } from "../src/db/schema";
import { desc, gte } from "drizzle-orm";

async function main() {
  console.log("=== Routers in DB ===");
  const routers = await db.select().from(mikrotiks);
  console.log(routers.map(r => ({ id: r.id, name: r.name, ipAddress: r.ipAddress, status: r.status })));

  console.log("\n=== Audit Logs (Last 20) ===");
  const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(20);
  logs.forEach(l => {
    console.log(`[${l.createdAt.toISOString()}] User ID: ${l.userId} | Action: ${l.action} | Details: ${l.details}`);
  });
}

main().catch(console.error).finally(() => process.exit());
