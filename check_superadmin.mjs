import { db } from "./src/db/index.js";
import { users } from "./src/db/schema.js";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const superadmins = await db.query.users.findMany({
      where: eq(users.role, "superadmin")
    });
    console.log(JSON.stringify(superadmins, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
run();
