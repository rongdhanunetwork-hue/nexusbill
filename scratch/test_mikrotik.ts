import { db } from "../src/db/index.js";
import { mikrotiks } from "../src/db/schema.js";
import { RouterOSClient } from "routeros-client";

async function run() {
  const router = await db.query.mikrotiks.findFirst();
  if (!router) {
    console.log("No router found");
    return;
  }
  
  const client = new RouterOSClient({
    host: router.ipAddress,
    user: router.username,
    password: router.password,
    port: router.apiPort || 8728,
  });

  try {
    await client.connect();
    const res = await client.write(["/ppp/active/print"]);
    console.log("Active count:", res.length);
    if (res.length > 0) {
      const first = res[0];
      console.log("Disconnecting:", first.name, "ID:", first[".id"]);
      // Does remove work?
      await client.write([
        "/ppp/active/remove",
        `=.id=${first[".id"]}`,
      ]);
      console.log("Removed!");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
    process.exit(0);
  }
}

run();
