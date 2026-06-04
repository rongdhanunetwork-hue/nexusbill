import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { startExpirationChecker } from "@/lib/sync";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __expirationCheckerStarted?: boolean;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool, { schema });

// Start the background expiration checker on server boot
if (typeof window === "undefined" && !globalForDb.__expirationCheckerStarted) {
  globalForDb.__expirationCheckerStarted = true;
  setTimeout(() => {
    startExpirationChecker();
  }, 1000);
}
