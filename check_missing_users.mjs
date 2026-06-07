import 'dotenv/config';
import pg from 'pg';
import { RouterOSAPI } from 'node-routeros';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Check both routers
const routers = await pool.query('SELECT * FROM mikrotiks ORDER BY id');

for (const r of routers.rows) {
  console.log(`\n=== Router ${r.id}: ${r.name} (${r.ip_address}:${r.api_port}) ===`);
  
  try {
    const client = new RouterOSAPI({
      host: r.ip_address,
      port: r.api_port,
      user: r.username,
      password: r.password,
      timeout: 10,
    });
    await client.connect();
    const secrets = await client.write('/ppp/secret/print');
    await client.close();
    
    // Count DB customers for this router
    const dbResult = await pool.query(
      'SELECT COUNT(*) as cnt FROM users WHERE role = $1 AND mikrotik_id = $2',
      ['customer', r.id]
    );
    const dbCount = parseInt(dbResult.rows[0].cnt);
    
    // Find missing ones
    const dbUsers = await pool.query(
      'SELECT pppoe_username FROM users WHERE role = $1 AND mikrotik_id = $2',
      ['customer', r.id]
    );
    const dbUsernames = new Set(dbUsers.rows.map(u => u.pppoe_username?.toLowerCase()).filter(Boolean));
    
    const missingFromDB = secrets.filter(s => !dbUsernames.has(s.name.toLowerCase()));
    
    console.log(`  Router PPPoE secrets: ${secrets.length}`);
    console.log(`  DB customers (mikrotik_id=${r.id}): ${dbCount}`);
    console.log(`  Missing from DB: ${missingFromDB.length}`);
    
    if (missingFromDB.length > 0) {
      console.log(`\n  Missing users:`);
      for (const m of missingFromDB) {
        console.log(`    - ${m.name} (profile: ${m.profile}, disabled: ${m.disabled})`);
      }
    }
  } catch (err) {
    console.log(`  ❌ Could not connect: ${err.message}`);
  }
}

// Also check DB customers with NO mikrotik_id
const noRouter = await pool.query(
  'SELECT COUNT(*) as cnt FROM users WHERE role = $1 AND mikrotik_id IS NULL',
  ['customer']
);
console.log(`\nDB customers with NO router assigned: ${noRouter.rows[0].cnt}`);

await pool.end();
process.exit(0);
