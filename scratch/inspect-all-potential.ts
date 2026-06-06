import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const dbUsers = await db.select().from(users);
  const customers = dbUsers.filter(u => u.role === "customer");

  console.log(`Total customers: ${customers.length}`);

  // Let's check for customers where pppoeUsername is null or empty
  const noUsername = customers.filter(c => !c.pppoeUsername || c.pppoeUsername.trim() === "");
  console.log(`\nCustomers with null/empty username: ${noUsername.length}`);

  // Let's check for customers where pppoeUsername is a dummy word or matches a placeholder
  const placeholderUsername = customers.filter(c => {
    if (!c.pppoeUsername) return false;
    const u = c.pppoeUsername.toLowerCase().trim();
    return u === "null" || u === "undefined" || u === "n/a" || u === "none" || u === "no" || u === "test" || u === "pending";
  });
  console.log(`\nCustomers with placeholder username ("null", "undefined", "n/a", etc.): ${placeholderUsername.length}`);
  placeholderUsername.forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}"`);
  });

  // Let's look at customers where name is a real-looking name (not same as username/phone), 
  // phone is a real-looking phone, but pppoeUsername matches phone or matches name.
  // Wait! If name is "Pronoy Saha" and phone is "01618721061" and username is "01618721061".
  // Let's count how many such users exist.
  const usernameIsPhoneButRealName = customers.filter(c => {
    if (!c.pppoeUsername) return false;
    const u = c.pppoeUsername.trim();
    const p = c.phone.trim();
    const n = c.name.toLowerCase().trim();
    
    // Username matches phone
    const isUsernamePhone = u === p;
    // Name is not dummy (does not match username/phone)
    const isNameReal = n !== u.toLowerCase() && n !== "test" && n !== "";
    
    return isUsernamePhone && isNameReal;
  });
  console.log(`\nCustomers where Username is exactly Phone, but Name is real/different: ${usernameIsPhoneButRealName.length}`);
  usernameIsPhoneButRealName.slice(0, 15).forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}"`);
  });

  // Let's check for customers where Username is exactly Name, but Phone is real/different
  const usernameIsNameButRealPhone = customers.filter(c => {
    if (!c.pppoeUsername) return false;
    const u = c.pppoeUsername.toLowerCase().trim();
    const n = c.name.toLowerCase().trim();
    const p = c.phone.trim();
    
    const isUsernameName = u === n;
    const isPhoneReal = p !== u && p !== "" && p.length > 5;
    
    return isUsernameName && isPhoneReal;
  });
  console.log(`\nCustomers where Username is exactly Name, but Phone is real/different: ${usernameIsNameButRealPhone.length}`);
  usernameIsNameButRealPhone.slice(0, 15).forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}"`);
  });

  // Let's look at all users created today (2026-06-07).
  // The current date in metadata is 2026-06-07. Let's see how many customers were created today!
  const today = new Date("2026-06-07T00:00:00+06:00");
  const createdToday = customers.filter(c => c.createdAt && new Date(c.createdAt) >= today);
  console.log(`\nCustomers created on 2026-06-07: ${createdToday.length}`);
  console.log(`Sample of customers created today (first 20):`);
  createdToday.slice(0, 20).forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}" | Created: ${c.createdAt}`);
  });
}

main().catch(console.error).finally(() => process.exit());
