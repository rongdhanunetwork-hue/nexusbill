import { db } from "@/db";
import { users, dataUsage, packages } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { insertAuditLog } from "@/lib/audit";
import { syncCustomerToMikrotik } from "@/lib/sync";

const CRON_SECRET = process.env.CRON_SECRET || "isp-cron-secret-2024";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch all active customers who have a package with a dataLimitGb
    const activeCustomers = await db.query.users.findMany({
      where: and(
        eq(users.role, "customer"),
        eq(users.status, "active"),
        isNotNull(users.packageId)
      ),
      with: { 
        package: true,
        dataUsage: true
      },
    });

    let fupAppliedCount = 0;

    for (const customer of activeCustomers) {
      if (!customer.package || !customer.package.dataLimitGb) continue;

      // Calculate total usage for the current cycle (summing up their dataUsage)
      const totalDownload = customer.dataUsage.reduce((sum, u) => sum + Number(u.downloadGb), 0);
      const totalUpload = customer.dataUsage.reduce((sum, u) => sum + Number(u.uploadGb), 0);
      const totalUsageGb = totalDownload + totalUpload;

      if (totalUsageGb >= customer.package.dataLimitGb) {
        // FUP Limit Reached!
        // We will mock lowering the speed by using the "expired" profile or a custom "FUP-Profile" 
        // if supported by Mikrotik. For now, we will sync them as "expired" or you can create a 
        // 1Mbps profile on MikroTik and pass it.
        
        if (customer.pppoeUsername && customer.note !== "FUP_APPLIED") {
          try {
            await syncCustomerToMikrotik(
              customer.pppoeUsername,
              undefined,
              undefined,
              "fup" // Assuming your MikroTik has a 'fup' profile for reduced speed
            );
            
            // Mark customer note to avoid re-applying unnecessarily
            await db.update(users)
              .set({ note: "FUP_APPLIED" })
              .where(eq(users.id, customer.id));

            await insertAuditLog(1, "FUP_TRIGGERED", `FUP applied to ${customer.name} for exceeding ${customer.package.dataLimitGb}GB limit.`);
            fupAppliedCount++;
          } catch (err) {
            console.error(`FUP Sync failed for ${customer.name}`, err);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "FUP check completed",
      fupAppliedCount
    });

  } catch (error) {
    console.error("FUP cron error:", error);
    return NextResponse.json({ error: "FUP check failed" }, { status: 500 });
  }
}
