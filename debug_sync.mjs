import 'dotenv/config';
import pg from 'pg';
import { RouterOSAPI } from 'node-routeros';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Simulate syncCustomerToMikrotik logic for a test user
const testUsername = 'RDN-MOJIB-1018'; // one of the customers from our DB

// 1. Get the customer from DB
const custResult = await pool.query(`
  SELECT u.id, u.name, u.pppoe_username, u.package_id, u.mikrotik_id, u.status,
         p.name as pkg_name, p.speed as pkg_speed
  FROM users u 
  LEFT JOIN packages p ON u.package_id = p.id
  WHERE u.pppoe_username = $1
`, [testUsername]);

const cust = custResult.rows[0];
console.log("=== Customer in DB ===");
console.log(`  Name: ${cust.name}, PPPoE: ${cust.pppoe_username}`);
console.log(`  PackageID: ${cust.package_id}, Package: "${cust.pkg_name}", Speed: "${cust.pkg_speed}"`);
console.log(`  MikrotikID: ${cust.mikrotik_id}, Status: ${cust.status}`);

// 2. Get the router config
let routerHost, routerPort, routerUser, routerPass;
if (cust.mikrotik_id) {
  const routerResult = await pool.query('SELECT * FROM mikrotiks WHERE id = $1', [cust.mikrotik_id]);
  if (routerResult.rows.length > 0) {
    const r = routerResult.rows[0];
    routerHost = r.ip_address;
    routerPort = r.api_port || 80;
    routerUser = r.username;
    routerPass = r.password;
    console.log(`\n  Router: ${r.name} (${routerHost}:${routerPort})`);
  }
} else {
  routerHost = process.env.MIKROTIK_HOST;
  routerPort = parseInt(process.env.MIKROTIK_API_PORT || '13065');
  routerUser = process.env.MIKROTIK_USER;
  routerPass = process.env.MIKROTIK_PASS;
}

console.log(`\n=== Connecting to Router: ${routerHost}:${routerPort} ===`);
const client = new RouterOSAPI({
  host: routerHost,
  port: routerPort,
  user: routerUser,
  password: routerPass,
  timeout: 10,
});

try {
  await client.connect();
  console.log("✅ Connected!");

  // Get secrets
  const secrets = await client.write('/ppp/secret/print');
  const existingSecret = secrets.find(s => s.name.toLowerCase() === testUsername.toLowerCase());
  
  if (existingSecret) {
    console.log(`\n=== Current Secret on Router ===`);
    console.log(`  Name: "${existingSecret.name}", Profile: "${existingSecret.profile}", Disabled: ${existingSecret.disabled}`);
  } else {
    console.log(`\n❌ Secret NOT FOUND on router for "${testUsername}"`);
  }

  // Simulate profile matching
  const normSpeed = cust.pkg_speed ? cust.pkg_speed.toLowerCase().replace(/\s+/g, "") : 'none';
  console.log(`\n=== Profile Matching ===`);
  console.log(`  DB Speed: "${cust.pkg_speed}" → Normalized: "${normSpeed}"`);
  
  const profiles = await client.write('/ppp/profile/print');
  const matchedProfile = profiles.find(p => p.name.toLowerCase() === normSpeed);
  console.log(`  Profile match found: ${matchedProfile ? `YES → "${matchedProfile.name}"` : 'NO ❌'}`);

  // Show what syncCustomerToMikrotik WOULD do
  let profile = existingSecret ? existingSecret.profile : "default";
  console.log(`  Initial profile (from existing secret): "${profile}"`);
  
  if (cust.package_id) {
    console.log(`  packageId is truthy (${cust.package_id}), checking...`);
    if (matchedProfile) {
      profile = normSpeed;
      console.log(`  ✅ Profile WOULD be updated to: "${profile}"`);
    } else {
      console.log(`  ❌ No matching profile found on router, keeping old: "${profile}"`);
    }
  } else {
    console.log(`  ❌ packageId is falsy (${cust.package_id}), profile stays: "${profile}"`);
  }

  await client.close();
} catch (err) {
  console.error("❌ Error:", err.message || err);
}

await pool.end();
process.exit(0);
