export const maxDuration = 60;
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { suspendUsers, unsuspendStaticUsers } from "@/lib/mikrotik";
import { syncCustomerToMikrotik } from "@/lib/sync";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allCustomers = await db.query.users.findMany({
      where: eq(users.role, "customer")
    });

    const now = new Date();
    let blockedCount = 0;
    let unblockedCount = 0;
    
    // Group users by router
    const usersByRouter: Record<number, typeof allCustomers> = {};
    for (const c of allCustomers) {
      const rId = c.mikrotikId || 0;
      if (!usersByRouter[rId]) usersByRouter[rId] = [];
      usersByRouter[rId].push(c);
    }

    for (const [rIdStr, rUsers] of Object.entries(usersByRouter)) {
      const routerId = Number(rIdStr) || undefined;
      
      const usersToBlock = [];
      const staticUsersToUnblock = [];
      
      for (const u of rUsers) {
        const isExpired = u.expireDate && new Date(u.expireDate) <= now;
        const needsBlock = isExpired || u.status === "expired" || u.status === "unpaid";
        
        if (needsBlock) {
          // Add to block list
          if (u.pppoeUsername || (u.customerType === "static" && u.ipAddress)) {
            usersToBlock.push({ pppoeUsername: u.pppoeUsername, ipAddress: u.ipAddress, type: u.customerType });
          }
          
          // Force DB update if it's expired by time but not marked in DB
          if (isExpired && u.status === "active") {
            await db.update(users).set({ status: "expired" }).where(eq(users.id, u.id));
          }
        } else {
          // Should be active
          if (u.pppoeUsername) {
            // Force sync PPPoE back to active
            try {
              await syncCustomerToMikrotik(u.pppoeUsername, undefined, u.packageId, "active", routerId);
              unblockedCount++;
            } catch (e) {
              console.warn(`Force sync active failed for ${u.pppoeUsername}`, e);
            }
          } else if (u.customerType === "static" && u.ipAddress) {
            staticUsersToUnblock.push({ ipAddress: u.ipAddress });
          }
        }
      }

      // Batch process blocks and static unblocks per router
      if (usersToBlock.length > 0) {
        try {
          await suspendUsers(usersToBlock, routerId);
          blockedCount += usersToBlock.length;
        } catch (e) {
          console.warn(`Force block failed for router ${routerId}`, e);
        }
      }
      
      if (staticUsersToUnblock.length > 0) {
        try {
          await unsuspendStaticUsers(staticUsersToUnblock, routerId);
          unblockedCount += staticUsersToUnblock.length;
        } catch (e) {
          console.warn(`Force unblock static failed for router ${routerId}`, e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Enforcement complete! Blocked ${blockedCount} unpaid/expired users and ensured ${unblockedCount} paid users have access.`
    });
  } catch (err) {
    console.error("Force sync error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
