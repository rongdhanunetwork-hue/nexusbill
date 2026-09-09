import { db } from "./src/db/index";
import { users } from "./src/db/schema";
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
