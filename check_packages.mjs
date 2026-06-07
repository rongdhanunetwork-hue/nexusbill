import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Check packages
const pkgResult = await pool.query('SELECT id, name, speed, price FROM packages ORDER BY id');
console.log("=== Packages in DB ===");
for (const p of pkgResult.rows) {
  console.log(`  ID: ${p.id}, Name: "${p.name}", Speed: "${p.speed}", Price: ${p.price}`);
}

// Check a few customers and their package mappings
const custResult = await pool.query(`
  SELECT u.id, u.name, u.pppoe_username, u.package_id, u.mikrotik_id, u.status,
         p.name as pkg_name, p.speed as pkg_speed
  FROM users u 
  LEFT JOIN packages p ON u.package_id = p.id
  WHERE u.role = 'customer' AND u.pppoe_username IS NOT NULL
  LIMIT 10
`);
console.log("\n=== Customers with PPPoE + Package ===");
for (const c of custResult.rows) {
  console.log(`  ID: ${c.id}, Name: ${c.name}, PPPoE: ${c.pppoe_username}, PkgID: ${c.package_id}, Pkg: "${c.pkg_name || 'NONE'}", Speed: "${c.pkg_speed || 'NONE'}", Router: ${c.mikrotik_id}, Status: ${c.status}`);
}

await pool.end();
process.exit(0);
