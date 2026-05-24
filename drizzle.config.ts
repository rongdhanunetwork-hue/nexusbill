import { config } from "dotenv";
import type { Config } from "drizzle-kit";
import path from "path";

config({ path: path.resolve(__dirname, ".env"), override: true });

export default {
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
