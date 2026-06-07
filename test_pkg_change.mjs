import 'dotenv/config';
import pg from 'pg';
import { RouterOSAPI } from 'node-routeros';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Pick a customer to test with - use MD Mohiuddin (RDN-MOJIB-1018)
const testUsername = 'RDN-MOJIB-1018';

// Get their info
const custResult = await pool.query(`
  SELECT u.id, u.name, u.pppoe_username, u.package_id, u.mikrotik_id, u.status
  FROM users u 
  WHERE u.pppoe_username = $1
`, [testUsername]);

const cust = custResult.rows[0];
console.log(`\n=== BEFORE CHANGE ===`);
console.log(`Customer: ${cust.name}, PPPoE: ${cust.pppoe_username}`);
console.log(`DB Package ID: ${cust.package_id}`);

// Get router 2 config
const routerResult = await pool.query('SELECT * FROM mikrotiks WHERE id = 2');
const r = routerResult.rows[0];

const client = new RouterOSAPI({
  host: r.ip_address,
  port: r.api_port,
  user: r.username,
  password: r.password,
  timeout: 10,
});
await client.connect();
const secretsBefore = await client.write('/ppp/secret/print');
const secretBefore = secretsBefore.find(s => s.name.toLowerCase() === testUsername.toLowerCase());
console.log(`Router Profile (BEFORE): "${secretBefore?.profile}" (disabled: ${secretBefore?.disabled})`);
await client.close();

console.log(`\n=== SIMULATING PACKAGE CHANGE IN PORTAL ===`);
console.log(`Changing package from ID ${cust.package_id} to ID 2 (Standard 20Mbps)`);

// Get pkg 2 info
const pkg2 = await pool.query('SELECT * FROM packages WHERE id = 2');
console.log(`Package 2: ${pkg2.rows[0].name}, Speed: ${pkg2.rows[0].speed}`);

// This is exactly what the PATCH handler does
// 1. Update DB
await pool.query('UPDATE users SET package_id = 2 WHERE id = $1', [cust.id]);
console.log(`DB updated: package_id → 2`);

// 2. Simulate syncCustomerToMikrotik
// (simplified version of the actual sync code)
const client2 = new RouterOSAPI({
  host: r.ip_address, port: r.api_port,
  user: r.username, password: r.password, timeout: 10,
});
await client2.connect();

const secrets = await client2.write('/ppp/secret/print');
const existingSecret = secrets.find(s => s.name.toLowerCase() === testUsername.toLowerCase());
const profiles = await client2.write('/ppp/profile/print');

// Simulate profile matching
const dbSpeed = pkg2.rows[0].speed; // "20 Mbps"
const normSpeed = dbSpeed.toLowerCase().replace(/\s+/g, '');
const speedNumber = dbSpeed.replace(/[^0-9]/g, '');

const exactMatch = profiles.find(p => p.name.toLowerCase() === normSpeed);
let profile = existingSecret ? existingSecret.profile : 'default';

if (exactMatch) {
  profile = exactMatch.name;
  console.log(`Profile: exact match → "${profile}"`);
} else {
  const numberMatch = profiles.find(p => {
    const pName = p.name.toLowerCase();
    if (['default','default-encryption','expired','block'].includes(pName)) return false;
    return p.name.replace(/[^0-9]/g, '') === speedNumber;
  });
  if (numberMatch) {
    profile = numberMatch.name;
    console.log(`Profile: number match → "${profile}"`);
  } else {
    console.log(`❌ No profile match for speed "${dbSpeed}"`);
  }
}

// Update the router
if (existingSecret) {
  await client2.write([
    '/ppp/secret/set',
    `=.id=${existingSecret['.id']}`,
    `=profile=${profile}`,
  ]);
  console.log(`Router updated: profile → "${profile}"`);
}

await client2.close();

// 3. Check AFTER change
const client3 = new RouterOSAPI({
  host: r.ip_address, port: r.api_port,
  user: r.username, password: r.password, timeout: 10,
});
await client3.connect();
const secretsAfter = await client3.write('/ppp/secret/print');
const secretAfter = secretsAfter.find(s => s.name.toLowerCase() === testUsername.toLowerCase());
console.log(`\n=== AFTER CHANGE ===`);
console.log(`Router Profile (AFTER): "${secretAfter?.profile}" ← Should be "20M-POOL"`);
await client3.close();

// Restore original
await pool.query('UPDATE users SET package_id = $1 WHERE id = $2', [cust.package_id, cust.id]);
console.log(`\nDB restored: package_id → ${cust.package_id}`);

// Restore router profile too
const client4 = new RouterOSAPI({
  host: r.ip_address, port: r.api_port,
  user: r.username, password: r.password, timeout: 10,
});
await client4.connect();
const secrets4 = await client4.write('/ppp/secret/print');
const s4 = secrets4.find(s => s.name.toLowerCase() === testUsername.toLowerCase());
await client4.write(['/ppp/secret/set', `=.id=${s4['.id']}`, `=profile=${secretBefore.profile}`]);
await client4.close();
console.log(`Router restored: profile → "${secretBefore?.profile}"`);

await pool.end();
process.exit(0);
