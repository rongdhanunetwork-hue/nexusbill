import { db } from './src/db/index.js';
import { mikrotiks } from './src/db/schema.js';
import { RouterOSAPI } from 'node-routeros';

async function testConnection() {
  const routers = await db.query.mikrotiks.findMany();
  if (routers.length === 0) {
    console.log("No routers found in DB.");
    return;
  }

  for (const router of routers) {
    console.log(`\nTesting connection to Router ID: ${router.id} (${router.name})...`);
    console.log(`IP: ${router.ipAddress}:${router.apiPort}`);
    
    const client = new RouterOSAPI({
      host: router.ipAddress,
      user: router.username,
      password: router.password,
      port: Number(router.apiPort) || 8728,
      keepalive: true,
      timeout: 10 // 10 seconds
    });

    try {
      await client.connect();
      console.log(`✅ Successfully connected to ${router.name}`);
      const identities = await client.write('/system/identity/print') as any[];
      console.log(`Identity: ${identities[0]?.name}`);
      client.close();
    } catch (e) {
      console.log(`❌ Failed to connect to ${router.name}`);
      console.log(`Error: ${e.message}`);
    }
  }
  process.exit(0);
}

testConnection().catch(console.error);
