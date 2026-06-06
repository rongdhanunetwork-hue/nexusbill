import { db } from "@/db";
import { users } from "@/db/schema";

async function main() {
  try {
    const all = await db.query.users.findMany({});
    const byPppoe = new Map<string, any[]>();
    const byPhone = new Map<string, any[]>();
    const byName = new Map<string, any[]>();

    for (const u of all) {
      const p = (u.pppoeUsername || '').toLowerCase().trim();
      const ph = (u.phone || '').toLowerCase().trim();
      const n = (u.name || '').toLowerCase().trim();
      if (p) {
        if (!byPppoe.has(p)) byPppoe.set(p, []);
        byPppoe.get(p).push(u);
      }
      if (ph) {
        if (!byPhone.has(ph)) byPhone.set(ph, []);
        byPhone.get(ph).push(u);
      }
      if (n) {
        if (!byName.has(n)) byName.set(n, []);
        byName.get(n).push(u);
      }
    }

    const dupPppoe = Array.from(byPppoe.entries()).filter(([k, v]) => v.length > 1);
    const dupPhone = Array.from(byPhone.entries()).filter(([k, v]) => v.length > 1);
    const dupName = Array.from(byName.entries()).filter(([k, v]) => v.length > 1);

    console.log('\nDuplicate groups by PPPoE username (>1):', dupPppoe.length);
    for (const [k, group] of dupPppoe.slice(0, 30)) {
      console.log(`\nPPPoE: ${k} -> count=${group.length}`);
      for (const g of group) console.log(`  id=${g.id} name=${g.name} phone=${g.phone} createdAt=${g.createdAt} updatedAt=${g.updatedAt}`);
    }

    console.log('\nDuplicate groups by phone (>1):', dupPhone.length);
    for (const [k, group] of dupPhone.slice(0, 30)) {
      console.log(`\nPhone: ${k} -> count=${group.length}`);
      for (const g of group) console.log(`  id=${g.id} pppoe=${g.pppoeUsername} name=${g.name} createdAt=${g.createdAt} updatedAt=${g.updatedAt}`);
    }

    console.log('\nDuplicate groups by name (>1):', dupName.length);
    for (const [k, group] of dupName.slice(0, 30)) {
      console.log(`\nName: ${k} -> count=${group.length}`);
      for (const g of group) console.log(`  id=${g.id} pppoe=${g.pppoeUsername} phone=${g.phone} createdAt=${g.createdAt} updatedAt=${g.updatedAt}`);
    }

    console.log('\nDone.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
