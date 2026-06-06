import { db } from "@/db";

async function main() {
  const all = await db.query.users.findMany({});
  const map = new Map<string, number>();
  for (const u of all) {
    const n = (u.name || '').toLowerCase().trim();
    if (!n) continue;
    map.set(n, (map.get(n) || 0) + 1);
  }
  let groups = 0;
  let totalDupRows = 0;
  for (const [k,v] of map.entries()) {
    if (v > 1) { groups++; totalDupRows += (v - 1); }
  }
  console.log('duplicate name groups:', groups);
  console.log('total duplicate rows (would be deleted):', totalDupRows);
  process.exit(0);
}
main();
