import { db } from "../src/db";
import { users, mikrotiks } from "../src/db/schema";
import { getPppoeSecrets, getPppoeActive } from "../src/lib/mikrotik";
import { eq } from "drizzle-orm";

async function main() {
  const allRouters = await db.select().from(mikrotiks).where(eq(mikrotiks.status, true));
  console.log(`Found ${allRouters.length} routers.`);

  for (const r of allRouters) {
    console.log(`\nChecking router: ${r.name}`);
    try {
      const secrets = await getPppoeSecrets(r.id);
      const active = await getPppoeActive(r.id);

      console.log(`- Total Secrets: ${secrets.length}`);
      console.log(`- Active Sessions: ${active.length}`);

      const target = "RDN-AMANAT-1032";
      
      const s = secrets.find(sec => sec.name?.toLowerCase() === target.toLowerCase());
      console.log(`\nSecret for ${target}:`, s ? { name: s.name, profile: s.profile, disabled: s.disabled, id: s[".id"] } : "Not found");
      
      const a = active.find(act => act.name?.toLowerCase() === target.toLowerCase());
      console.log(`Active session for ${target}:`, a ? { name: a.name, address: a.address, id: a[".id"] } : "Not found");

      // Check DB status
      const dbUser = await db.query.users.findFirst({ where: eq(users.pppoeUsername, target) });
      console.log(`DB User for ${target}:`, dbUser ? { id: dbUser.id, status: dbUser.status, expireDate: dbUser.expireDate } : "Not found");

    } catch (e) {
      console.log(`Error on router ${r.name}:`, e);
    }
  }
  process.exit(0);
}

main();
