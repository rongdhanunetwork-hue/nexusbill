import { db } from "../src/db";
import { users } from "../src/db/schema";

async function main() {
  console.log("--- USERS IN DB ---");
  const dbUsers = await db.select().from(users);
  console.log(dbUsers.map(u => ({ id: u.id, name: u.name, phone: u.phone, role: u.role, approvalStatus: u.approvalStatus, status: u.status })));
}

main().catch(console.error);
