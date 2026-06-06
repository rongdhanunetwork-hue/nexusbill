import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const dbUsers = await db.select().from(users);
  const customers = dbUsers.filter(u => u.role === "customer");

  console.log(`Total customers: ${customers.length}`);

  // Category A: Name and Mobile Number are dummy/identical to username
  // "ইউজারনেম হয়ে আছে। ওখানে আপনার নাম, মোবাইল নাম্বার কিচ্ছু নাই"
  const noNameNoMobile = customers.filter(c => {
    if (!c.pppoeUsername) return false;
    const u = c.pppoeUsername.toLowerCase().trim();
    const n = c.name.toLowerCase().trim();
    const p = c.phone.toLowerCase().trim();
    
    // Check if Name is either same as username or starts with it (e.g. RDN-AMANAT-1053)
    const isNameDummy = n === u || n === "";
    // Check if Phone is same as username, or starts with it, or has username-random suffix, or is same as name
    const isPhoneDummy = p === u || p.startsWith(u) || p === "";
    
    return isNameDummy && isPhoneDummy;
  });

  // Category B: Only Name/Mobile, NO username (or username is empty/null/numeric dummy)
  // "শুধু নাম, মোবাইল নাম্বার হয়ে আছে, ইউজারনেম নাই"
  const onlyNameMobileNoUsername = customers.filter(c => {
    // No username or username is null/empty
    const hasNoUsername = !c.pppoeUsername || c.pppoeUsername.trim() === "";
    
    // Check if name and phone look like real name/phone (not matching username)
    // Actually, if username is completely empty or null, then it has no username but has name and phone.
    return hasNoUsername;
  });

  console.log(`\n--- CATEGORY A: Username exists, but NO Name & Mobile (both are dummy/same as username) ---`);
  console.log(`Count: ${noNameNoMobile.length}`);
  noNameNoMobile.slice(0, 15).forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}" | Created: ${c.createdAt}`);
  });

  console.log(`\n--- CATEGORY B: Has Name & Mobile, but NO Username ---`);
  console.log(`Count: ${onlyNameMobileNoUsername.length}`);
  onlyNameMobileNoUsername.slice(0, 15).forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}" | Created: ${c.createdAt}`);
  });

  // Let's also see if there are other candidates.
  // For example, if username is a number, e.g. "1063", but they have a real Name and Phone.
  // Wait, is a numeric username like "1063" considered "no username" by the user? Or is it a PPPoE username?
  // Usually, PPPoE usernames can be numbers or text.
  // Let's look at customers who have username, name and phone, but where phone is a real number, and username is a real name.
  // Wait, what if username is missing, but it is not null, maybe it is a dummy value?
  // Let's list customers where pppoeUsername is null or empty. It says Count: 0 in Category 1 earlier.
  // So there are 0 users with null/empty pppoeUsername!
  // Wait, if there are 0 users with null/empty pppoeUsername, then how could there be "শুধু নাম, মোবাইল নাম্বার হয়ে আছে, ইউজারনেম নাই" (only name and mobile, no username)?
  // Let's look at the database. Maybe the username field is set to a dummy value (like a copy of the name or phone or "N/A" or "no username" or same as phone)?
  // Let's check if there are customers where `pppoeUsername` is equal to the `phone` number (like username = "01618721061" and phone = "01618721061" and name = "Pronoy Saha").
  // In that case, the username is exactly the phone number. Is that what they mean by "username nai" (no username, it's just the phone number)?
  // Or maybe where username is a placeholder?
  // Let's print out some stats about `pppoeUsername` matching `phone` or `name` or being numeric, to find what the user meant.
  
  const usernameEqualsPhone = customers.filter(c => {
    if (!c.pppoeUsername) return false;
    return c.pppoeUsername.trim() === c.phone.trim();
  });
  console.log(`\n--- CATEGORY C: Username is equal to Phone number ---`);
  console.log(`Count: ${usernameEqualsPhone.length}`);
  usernameEqualsPhone.slice(0, 15).forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}" | Created: ${c.createdAt}`);
  });

  const usernameEqualsName = customers.filter(c => {
    if (!c.pppoeUsername) return false;
    return c.pppoeUsername.toLowerCase().trim() === c.name.toLowerCase().trim() && c.phone.trim() !== c.pppoeUsername.trim();
  });
  console.log(`\n--- CATEGORY D: Username is equal to Name (but phone is different) ---`);
  console.log(`Count: ${usernameEqualsName.length}`);
  usernameEqualsName.slice(0, 15).forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Phone: "${c.phone}" | Username: "${c.pppoeUsername}" | Created: ${c.createdAt}`);
  });
}

main().catch(console.error).finally(() => process.exit());
