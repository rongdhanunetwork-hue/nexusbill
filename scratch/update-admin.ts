import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Updating Admin user...");
  
  const hashedPassword = await bcrypt.hash("password123", 12);
  
  const result = await db.update(users)
    .set({
      phone: "01700000000",
      password: hashedPassword,
      name: "RDN INTERNET SERVICE PROVIDERS" // Ensure name is correct
    })
    .where(eq(users.id, 1));
    
  console.log("Update complete!");
}

main().catch(console.error);
