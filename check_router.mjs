import 'dotenv/config';
import { RouterOSAPI } from 'node-routeros';

// Connect to the router and list all PPP profiles
const client = new RouterOSAPI({
  host: process.env.MIKROTIK_HOST || 'bd2.mikrovpn.xyz',
  port: parseInt(process.env.MIKROTIK_API_PORT || '13065'),
  user: process.env.MIKROTIK_USER || 'admin',
  password: process.env.MIKROTIK_PASS || 'admin',
  timeout: 10,
});

try {
  await client.connect();
  console.log("✅ Connected to MikroTik Router");
  
  // Get PPP profiles
  const profiles = await client.write('/ppp/profile/print');
  console.log("\n=== PPP Profiles on Router ===");
  for (const p of profiles) {
    console.log(`  Name: "${p.name}", Rate-Limit: "${p['rate-limit'] || 'none'}", Local: ${p['local-address'] || 'N/A'}, Remote: ${p['remote-address'] || 'N/A'}`);
  }
  
  // Get a few PPP secrets to see their current profiles
  const secrets = await client.write('/ppp/secret/print');
  console.log(`\n=== PPP Secrets (first 10 of ${secrets.length}) ===`);
  for (const s of secrets.slice(0, 10)) {
    console.log(`  Name: "${s.name}", Profile: "${s.profile}", Disabled: ${s.disabled}`);
  }
  
  await client.close();
} catch (err) {
  console.error("❌ Connection error:", err.message || err);
}
process.exit(0);
