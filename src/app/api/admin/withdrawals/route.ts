import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { withdrawalRequests, users, transactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/admin/withdrawals — fetch all reseller withdrawal requests with reseller details
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db.query.withdrawalRequests.findMany({
      orderBy: [desc(withdrawalRequests.createdAt)],
      with: {
        reseller: {
          columns: {
            id: true,
            name: true,
            phone: true,
            walletBalance: true,
          }
        }
      }
    });
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PATCH /api/admin/withdrawals — approve or reject a withdrawal request
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, action, note } = await req.json(); // action is 'approve' or 'reject'

    if (!id || !action) {
      return NextResponse.json({ error: "Request ID and action are required" }, { status: 400 });
    }

    const request = await db.query.withdrawalRequests.findFirst({
      where: eq(withdrawalRequests.id, Number(id)),
    });

    if (!request) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
    }

    if (request.status !== "pending") {
      return NextResponse.json({ error: `Request already processed as ${request.status}` }, { status: 400 });
    }

    const resellerId = request.resellerId;
    const withdrawAmount = Number(request.amount);

    if (action === "approve") {
      // Fetch current reseller to check wallet balance
      const reseller = await db.query.users.findFirst({
        where: eq(users.id, resellerId),
      });

      if (!reseller) {
        return NextResponse.json({ error: "Reseller account not found" }, { status: 404 });
      }

      const currentBalance = Number(reseller.walletBalance || 0);
      if (withdrawAmount > currentBalance) {
        return NextResponse.json({
          error: `Reseller has insufficient balance (Current: ৳${currentBalance.toFixed(2)}, Request: ৳${withdrawAmount.toFixed(2)})`
        }, { status: 400 });
      }

      // Deduct balance and insert transaction log
      const newBalance = (currentBalance - withdrawAmount).toFixed(2);
      await db.update(users)
        .set({ walletBalance: String(newBalance) })
        .where(eq(users.id, resellerId));

      await db.insert(transactions).values({
        resellerId,
        amount: String(withdrawAmount),
        type: "refund", // Refund/Payout type transaction
      });

      // Update withdrawal status
      await db.update(withdrawalRequests)
        .set({
          status: "approved",
          note: note || request.note,
        })
        .where(eq(withdrawalRequests.id, Number(id)));

      // Optional: Send SMS to reseller about approval
      try {
        const { sendSMS } = await import("@/lib/sms");
        await sendSMS(
          reseller.phone,
          `Dear ${reseller.name}, your withdrawal request of Tk ${withdrawAmount.toFixed(2)} has been approved. Remaining balance: Tk ${newBalance}.`,
          "manual"
        );
      } catch (smsErr) {
        console.error("SMS notification failed:", smsErr);
      }

      return NextResponse.json({ success: true, message: "Withdrawal approved successfully" });

    } else if (action === "reject") {
      // Update withdrawal status
      await db.update(withdrawalRequests)
        .set({
          status: "rejected",
          note: note || request.note,
        })
        .where(eq(withdrawalRequests.id, Number(id)));

      // Send rejection SMS
      try {
        const reseller = await db.query.users.findFirst({
          where: eq(users.id, resellerId),
        });
        if (reseller) {
          const { sendSMS } = await import("@/lib/sms");
          await sendSMS(
            reseller.phone,
            `Dear ${reseller.name}, your withdrawal request of Tk ${withdrawAmount.toFixed(2)} has been rejected. Reason: ${note || "Contact admin"}.`,
            "manual"
          );
        }
      } catch (smsErr) {
        console.error("SMS notification failed:", smsErr);
      }

      return NextResponse.json({ success: true, message: "Withdrawal rejected successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
