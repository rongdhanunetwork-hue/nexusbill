import 'dotenv/config';
import { syncMikrotikSecrets } from './src/lib/sync';

async function testSync() {
  console.log("Starting sync...");
  try {
    await syncMikrotikSecrets();
    console.log("Sync finished.");
  } catch(e) {
    console.error("Error:", e);
  }
}

testSync();
