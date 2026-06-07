import { getPppoeSecrets } from "../src/lib/mikrotik";

async function main() {
  try {
    console.log("Fetching secrets from default/first router...");
    const secrets = await getPppoeSecrets();
    console.log("Total secrets on MikroTik:", secrets.length);
    console.log("Sample secrets (first 10):", secrets.slice(0, 10).map(s => ({ id: s[".id"], name: s.name, disabled: s.disabled })));
  } catch (err) {
    console.error("Failed to fetch secrets:", err);
  }
}

main().then(() => process.exit(0)).catch(console.error);
