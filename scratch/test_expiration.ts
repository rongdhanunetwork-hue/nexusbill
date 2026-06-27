import { db } from '../src/db';
import { users, invoices, packages } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { checkAndSuspendExpiredUsers } from '../src/lib/sync';

async function testExpiration() {
  try {
    console.log("--- Starting Expiration Test ---");
    
    // 1. Create a dummy package
    const [pkg] = await db.insert(packages).values({
      name: "Test Package",
      speed: "10 Mbps",
      price: "500",
      adminId: 1
    }).returning();
    
    console.log("Created dummy package:", pkg.id);

    // 2. Create a dummy user with expireDate in the past
    const [user] = await db.insert(users).values({
      name: "Test Expired User",
      phone: "01700000000" + Math.random().toString().slice(2, 6),
      password: "password123",
      pppoeUsername: "test_expired_user_" + Date.now(),
      status: "active",
      role: "customer",
      packageId: pkg.id,
      expireDate: new Date(Date.now() - 100000), // Expired
      adminId: 1
    }).returning();

    console.log("Created dummy expired user:", user.id);

    // 3. Run the expiration logic
    console.log("Running checkAndSuspendExpiredUsers()...");
    await checkAndSuspendExpiredUsers();
    
    // 4. Verify results
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, user.id)
    });
    
    const userInvoices = await db.query.invoices.findMany({
      where: eq(invoices.userId, user.id)
    });

    console.log("--- TEST RESULTS ---");
    console.log("User Status (Expected: expired):", updatedUser?.status);
    console.log("Number of Invoices generated (Expected: 1):", userInvoices.length);
    if (userInvoices.length > 0) {
      console.log("Invoice Status (Expected: unpaid):", userInvoices[0].status);
      console.log("Invoice Amount (Expected: 500):", userInvoices[0].amount);
    }

    // 5. Cleanup
    await db.delete(invoices).where(eq(invoices.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
    await db.delete(packages).where(eq(packages.id, pkg.id));
    
    console.log("Cleanup completed.");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

testExpiration();
