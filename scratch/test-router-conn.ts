import { RouterOSAPI } from "node-routeros";

async function main() {
  const host = "bd2.mikrovpn.xyz";
  const port = 13065;
  const user = "api_user";
  const pass = "api_user123";

  console.log(`Connecting to MikroTik router at ${host}:${port} as ${user}...`);
  
  const client = new RouterOSAPI({
    host,
    port,
    user,
    password: pass,
    timeout: 5,
  });

  client.on("error", (err) => {
    console.error("Socket error event:", err);
  });

  try {
    await client.connect();
    console.log("Connected successfully!");
    const data = await client.write("/system/resource/print");
    console.log("System Resource:", data);
  } catch (err) {
    console.error("Connection failed with error:", err);
  } finally {
    try {
      await client.close();
      console.log("Connection closed.");
    } catch {}
  }
}

main().catch(console.error);
