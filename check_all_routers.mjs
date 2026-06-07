import 'dotenv/config';
import pg from 'pg';
import { RouterOSAPI } from 'node-routeros';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get all routers from DB
const routerResult = await pool.query('SELECT * FROM mikrotiks ORDER BY id');
console.log("=== All Routers in DB ===\n");

for (const r of routerResult.rows) {
  console.log(`--- Router ${r.id}: ${r.name} (${r.ip_address}:${r.api_port}) ---`);
  
  const client = new RouterOSAPI({
    host: r.ip_address,
    port: r.api_port || 80,
    user: r.username,
    password: r.password,
    timeout: 10,
  });

  try {
    await client.connect();
    const profiles = await client.write('/ppp/profile/print');
    console.log("  Profiles:");
    for (const p of profiles) {
      console.log(`    - "${p.name}" (Rate: ${p['rate-limit'] || 'none'})`);
    }
    await client.close();
  } catch (err) {
    console.log(`  ❌ Connection failed: ${err.message || err}`);
  }
  console.log("");
}

// Also check default router
console.log(`--- Default Router (${process.env.MIKROTIK_HOST}:${process.env.MIKROTIK_API_PORT}) ---`);
const defClient = new RouterOSAPI({
  host: process.env.MIKROTIK_HOST,
  port: parseInt(process.env.MIKROTIK_API_PORT || '13065'),
  user: process.env.MIKROTIK_USER,
  password: process.env.MIKROTIK_PASS,
  timeout: 10,
});
try {
  await defClient.connect();
  const profiles = await defClient.write('/ppp/profile/print');
  console.log("  Profiles:");
  for (const p of profiles) {
    console.log(`    - "${p.name}" (Rate: ${p['rate-limit'] || 'none'})`);
  }
  await defClient.close();
} catch (err) {
  console.log(`  ❌ Connection failed: ${err.message || err}`);
}

await pool.end();
process.exit(0);
