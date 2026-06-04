import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, lt, and, isNotNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Secret key to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET || "isp-cron-secret-2024";

export async function GET(req: NextRequest) {
  // Verify secret key
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all active customers whose expiry has passed
    const expiredCustomers = await db.query.users.findMany({
      where: and(
        eq(users.role, "customer"),
        eq(users.status, "active"),
        isNotNull(users.expireDate),
        lt(users.expireDate, now)
      ),
      with: { package: true },
    });

    let expiredCount = 0;
    let smsCount = 0;
    let mikrotikCount = 0;
    let renewedCount = 0;
    const errors: string[] = [];

    for (const customer of expiredCustomers) {
      try {
        const pkgPrice = customer.package ? parseFloat(String(customer.package.price)) : 0;
        const wallet = parseFloat(String(customer.walletBalance || "0"));

        if (customer.autoRenew && pkgPrice > 0 && wallet >= pkgPrice) {
          // Auto Renew logic
          const newWalletBalance = wallet - pkgPrice;
          
          // Calculate new expire date based on package duration
          const durationDays = customer.package?.durationDays || 30;
          const newExpireDate = new Date(customer.expireDate || now);
          newExpireDate.setDate(newExpireDate.getDate() + durationDays);

          await db.update(users)
            .set({ 
              walletBalance: String(newWalletBalance),
              expireDate: newExpireDate 
            })
            .where(eq(users.id, customer.id));

          // Log payment/invoice
          try {
            const { invoices, payments } = await import("@/db/schema");
            const [inv] = await db.insert(invoices).values({
              userId: customer.id,
              amount: String(pkgPrice),
              status: "paid",
              dueDate: newExpireDate,
              createdAt: now,
            }).returning();

            await db.insert(payments).values({
              userId: customer.id,
              amount: String(pkgPrice),
              method: "wallet",
              status: "approved",
              createdAt: now,
            });
          } catch (e) {
            errors.push(`Auto-renew invoice error for ${customer.name}: ${e}`);
          }

          renewedCount++;
          continue; // Skip the expiration logic below
        }

        // Expiration Logic
        await db.update(users)
          .set({ status: "expired" })
          .where(eq(users.id, customer.id));

        expiredCount++;

        // Disable on MikroTik
        if (customer.pppoeUsername) {
          try {
            const { syncCustomerToMikrotik } = await import("@/lib/sync");
            await syncCustomerToMikrotik(
              customer.pppoeUsername,
              undefined,
              customer.packageId,
              "expired",
              customer.mikrotikId
            );
            mikrotikCount++;
          } catch (e) {
            errors.push(`MikroTik error for ${customer.name}: ${e}`);
          }
        }

        // Send SMS notification
        try {
          const { sendSMS } = await import("@/lib/sms");
          const msg = `প্রিয় ${customer.name}, আপনার ইন্টারনেট সংযোগের মেয়াদ শেষ হয়েছে। দয়া করে বিল পরিশোধ করুন বা আপনার রিসেলারকে যোগাযোগ করুন।`;
          await sendSMS(customer.phone, msg);
          smsCount++;
        } catch {
          // SMS failure is non-blocking
        }
      } catch (e) {
        errors.push(`Error processing customer ${customer.id}: ${e}`);
      }
    }

    // Also check customers who expire in 3 days — send reminder SMS
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const soonToExpire = await db.query.users.findMany({
      where: and(
        eq(users.role, "customer"),
        eq(users.status, "active"),
        isNotNull(users.expireDate),
        lt(users.expireDate, threeDaysFromNow),
      ),
    });

    // Filter to only those expiring in next 3 days (not already expired)
    const reminderCustomers = soonToExpire.filter(
      (c) => c.expireDate && new Date(c.expireDate) > now
    );

    let reminderCount = 0;
    for (const customer of reminderCustomers) {
      try {
        const { sendSMS } = await import("@/lib/sms");
        const expDate = customer.expireDate
          ? new Date(customer.expireDate).toLocaleDateString("en-BD")
          : "N/A";
        const msg = `প্রিয় ${customer.name}, আপনার ইন্টারনেট সংযোগের মেয়াদ ${expDate} তারিখে শেষ হবে। সংযোগ চালু রাখতে দ্রুত বিল পরিশোধ করুন।`;
        await sendSMS(customer.phone, msg);
        reminderCount++;
      } catch {
        // Non-blocking
      }
    }



    // Cleanup old notices (older than 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { notices } = await import("@/db/schema");
    let deletedNoticesCount = 0;
    try {
      const deleted = await db.delete(notices)
        .where(lt(notices.createdAt, thirtyDaysAgo))
        .returning({ id: notices.id });
      deletedNoticesCount = deleted.length;
    } catch (e) {
      errors.push(`Error deleting old notices: ${e}`);
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      expired: expiredCount,
      renewed: renewedCount,
      mikrotikDisabled: mikrotikCount,
      smsSent: smsCount,
      reminders: reminderCount,
      deletedNotices: deletedNoticesCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Cron job failed", details: String(error) },
      { status: 500 }
    );
  }
}

// Also support POST for manual trigger from admin
export async function POST(req: NextRequest) {
  return GET(req);
}
