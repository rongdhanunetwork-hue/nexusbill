import { getPppoeSecrets } from "../src/lib/mikrotik";

async function main() {
  try {
    console.log("Fetching secrets from default router (routerId = undefined)...");
    const secretsDefault = await getPppoeSecrets();
    console.log("Total secrets on default router:", secretsDefault.length);

    console.log("\nFetching secrets from router 2...");
    const secrets2 = await getPppoeSecrets(2);
    console.log("Total secrets on router 2:", secrets2.length);

    console.log("\nFetching secrets from router 1...");
    const secrets1 = await getPppoeSecrets(1);
    console.log("Total secrets on router 1:", secrets1.length);
  } catch (err) {
    console.error("Failed to compare secrets:", err);
  }
}

main().then(() => process.exit(0)).catch(console.error);
