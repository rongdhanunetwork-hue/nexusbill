import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminRentalRequests, users, adminPaymentLogs, systemNotifications } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const requestId = parseInt(resolvedParams.id, 10);

    const rentalReq = await db.query.adminRentalRequests.findFirst({
      where: eq(adminRentalRequests.id, requestId),
    });

    if (!rentalReq || rentalReq.status !== "pending") {
      return NextResponse.json({ error: "Pending request not found" }, { status: 404 });
    }

    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, rentalReq.adminId),
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    const daysToAdd = rentalReq.requestedDays || 30;
    const now = new Date();
    const oldExpire = adminUser.expireDate ? new Date(adminUser.expireDate) : now;
    const baseDate = oldExpire > now ? oldExpire : now;

    const newExpireDate = new Date(baseDate);
    newExpireDate.setDate(newExpireDate.getDate() + daysToAdd);

    // 1. Update Admin status and expireDate
    await db.update(users)
      .set({
        status: "active",
        expireDate: newExpireDate,
      })
      .where(eq(users.id, adminUser.id));

    // 2. Mark request as approved
    await db.update(adminRentalRequests)
      .set({
        status: "approved",
        approvedAt: now,
      })
      .where(eq(adminRentalRequests.id, rentalReq.id));

    // 3. Log in adminPaymentLogs
    await db.insert(adminPaymentLogs).values({
      adminId: adminUser.id,
      amount: rentalReq.amount,
      trxId: rentalReq.trxId || `MANUAL-${rentalReq.id}`,
      method: rentalReq.paymentMethod || "cash",
      daysAdded: daysToAdd,
      oldExpireDate: oldExpire,
      newExpireDate: newExpireDate,
    });

    // 4. Send SMS to Admin
    if (adminUser.phone) {
      const pMethod = (rentalReq.paymentMethod || "CASH").toUpperCase();
      const smsMessage = `Dear ${adminUser.name}, your software rental payment of BDT ${rentalReq.amount} (${pMethod}) has been APPROVED. Your new validity: ${newExpireDate.toLocaleDateString('en-GB')}. Thank you!`;
      try {
        await sendSMS(adminUser.phone, smsMessage);
      } catch (e) {
        console.error("SMS notification error:", e);
      }
    }

    // 5. Create System Notification for Admin
    try {
      await db.insert(systemNotifications).values({
        userId: adminUser.id,
        title: "Rental Payment Approved!",
        message: `Super Admin approved your manual software rental payment of BDT ${rentalReq.amount}. Extended till ${newExpireDate.toLocaleDateString('en-GB')}.`,
        link: "/admin",
      });
    } catch (e) {
      console.error("Notification error:", e);
    }

    return NextResponse.json({
      success: true,
      message: `Admin subscription approved and extended by +${daysToAdd} days!`,
      newExpireDate: newExpireDate.toISOString(),
    });
  } catch (error) {
    console.error("Approve rental request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
