import 'dotenv/config';
import pg from 'pg';
import { RouterOSAPI } from 'node-routeros';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get all customers on Router 2 and check their current profile on the router
const custResult = await pool.query(`
  SELECT u.id, u.name, u.pppoe_username, u.package_id, u.mikrotik_id, u.status,
         p.name as pkg_name, p.speed as pkg_speed
  FROM users u 
  LEFT JOIN packages p ON u.package_id = p.id
  WHERE u.role = 'customer' AND u.mikrotik_id = 2 AND u.pppoe_username IS NOT NULL
  ORDER BY u.id
  LIMIT 20
`);

const routerResult = await pool.query('SELECT * FROM mikrotiks WHERE id = 2');
const r = routerResult.rows[0];
console.log(`Connecting to Router 2: ${r.name} (${r.ip_address}:${r.api_port})`);

const client = new RouterOSAPI({
  host: r.ip_address,
  port: r.api_port,
  user: r.username,
  password: r.password,
  timeout: 10,
});

await client.connect();
console.log('✅ Connected!\n');

const secrets = await client.write('/ppp/secret/print');
const secretMap = new Map();
for (const s of secrets) {
  secretMap.set(s.name.toLowerCase(), s);
}

console.log('=== Customer vs Router Profile Check ===\n');
console.log('Name                         | PPPoE               | DB Pkg        | DB Speed | Router Profile | Match?');
console.log('------------------------------|---------------------|---------------|----------|----------------|-------');

for (const c of custResult.rows) {
  const secret = secretMap.get(c.pppoe_username?.toLowerCase());
  const routerProfile = secret ? secret.profile : 'NOT FOUND';
  
  // Simulate matching
  const normSpeed = c.pkg_speed ? c.pkg_speed.toLowerCase().replace(/\s+/g, '') : '';
  const speedNum = c.pkg_speed ? c.pkg_speed.replace(/[^0-9]/g, '') : '';
  
  let expectedProfile = '?';
  if (normSpeed === routerProfile?.toLowerCase()) {
    expectedProfile = 'EXACT MATCH';
  } else if (speedNum && routerProfile?.replace(/[^0-9]/g, '') === speedNum) {
    expectedProfile = 'NUMBER MATCH';
  } else {
    expectedProfile = 'MISMATCH ❌';
  }
  
  const name = (c.name || '').substring(0, 27).padEnd(27);
  const pppoe = (c.pppoe_username || '').substring(0, 19).padEnd(19);
  const pkgName = (c.pkg_name || 'NONE').substring(0, 13).padEnd(13);
  const speed = (c.pkg_speed || 'N/A').padEnd(8);
  const profile = (routerProfile || 'N/A').padEnd(14);
  
  console.log(`${name} | ${pppoe} | ${pkgName} | ${speed} | ${profile} | ${expectedProfile}`);
}

await client.close();
await pool.end();
process.exit(0);
