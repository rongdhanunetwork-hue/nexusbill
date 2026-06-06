import { testConnection } from "../src/lib/mikrotik";
import { db } from "../src/db";
import { mikrotiks } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Testing env credentials (fallback):");
  const resEnv = await testConnection(undefined);
  console.log("Env result:", resEnv);

  console.log("\nTesting database router (ID 1) credentials:");
  const resDb = await testConnection(1);
  console.log("DB result:", resDb);
}

main().catch(console.error);
