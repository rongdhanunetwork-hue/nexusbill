import { getClient } from './src/lib/mikrotik';

async function testSuspend() {
  const client = await getClient(); // Default router
  try {
    await client.connect();
    console.log("Connected to Mikrotik");

    const secrets = await client.write("/ppp/secret/print");
    console.log("Found", secrets.length, "secrets");

    const active = await client.write("/ppp/active/print");
    console.log("Found", active.length, "active sessions");

    // We don't want to actually disconnect someone randomly, 
    // but let's just see if we can read the properties correctly.
    if (active.length > 0) {
      const firstActive = active[0];
      console.log("First active session:", firstActive);
    }

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    try { await client.close(); } catch {}
  }
}

testSuspend().finally(() => process.exit(0));
