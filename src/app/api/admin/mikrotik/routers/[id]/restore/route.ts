import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getPppoeSecrets, syncCustomerToMikrotik } from "@/lib/sync";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const routerId = Number(id);
  
  if (!routerId) {
    return NextResponse.json({ error: "Invalid router ID" }, { status: 400 });
  }

  try {
    // 1. Fetch all PPP secrets currently in the Mikrotik
    const secrets = await getPppoeSecrets(routerId);
    
    // Create a Set of all usernames currently in Mikrotik (lowercase for case-insensitive matching)
    const mikrotikUsernames = new Set(secrets.map(s => s.name.toLowerCase()));

    // 2. Fetch all customers from the DB assigned to this router who have a PPPoE Username
    const dbCustomers = await db.query.users.findMany({
      where: and(
        eq(users.role, "customer"),
        eq(users.mikrotikId, routerId),
        isNotNull(users.pppoeUsername)
      )
    });

    let restoredCount = 0;
    const restoredUsers = [];

    // 3. Compare and Restore missing users
    for (const customer of dbCustomers) {
      if (!customer.pppoeUsername) continue;

      const usernameLower = customer.pppoeUsername.toLowerCase();

      // If the user exists in DB but is MISSING from Mikrotik Secrets
      if (!mikrotikUsernames.has(usernameLower)) {
        // Fallback password: try phone number, if none, use 123456
        const newPassword = customer.phone ? customer.phone.trim() : "123456";

        try {
          // Recreate the user on Mikrotik
          // This uses the current DB status, so if they are 'expired', they will be restored as disabled=yes
          await syncCustomerToMikrotik(
            customer.pppoeUsername,
            newPassword,
            customer.packageId,
            customer.status,
            routerId
          );
          
          restoredCount++;
          restoredUsers.push(customer.pppoeUsername);
          console.log(`[Restore] Successfully restored missing user ${customer.pppoeUsername} to Router ${routerId}`);
        } catch (restoreErr) {
          console.error(`[Restore] Failed to restore missing user ${customer.pppoeUsername}:`, restoreErr);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      restoredCount,
      restoredUsers,
      message: restoredCount > 0 
        ? `Successfully restored ${restoredCount} missing users to the router.` 
        : `All database users are already present in the router. No action needed.`
    });

  } catch (err) {
    console.error("Error restoring missing users to Mikrotik:", err);
    return NextResponse.json({ error: "Failed to connect to MikroTik or restore users. " + String(err) }, { status: 500 });
  }
}
