import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, payments, invoices, packages, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { syncCustomerToMikrotik } from "@/lib/sync";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, amount, due, billingType, duration, method, discount, note, renewBack } = body;

    if (!userId || amount === undefined) {
      return NextResponse.json({ error: "User ID and amount are required" }, { status: 400 });
    }

    const customer = await db.query.users.findFirst({
      where: eq(users.id, Number(userId)),
      with: { package: true }
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Security: Reseller can only recharge their own customers
    if (session.role === "reseller" && customer.resellerId !== session.userId) {
      return NextResponse.json({ error: "Unauthorized: Customer is not assigned to you" }, { status: 403 });
    }

    // Check reseller balance if logged in as reseller
    let reseller = null;
    if (session.role === "reseller") {
      reseller = await db.query.users.findFirst({
        where: eq(users.id, session.userId)
      });
      if (!reseller) {
        return NextResponse.json({ error: "Reseller account not found" }, { status: 404 });
      }
      const balance = Number(reseller.walletBalance || 0);
      if (balance < Number(amount)) {
        return NextResponse.json({ error: "Insufficient balance in your reseller wallet" }, { status: 400 });
      }
    }

    // Calculate new expiration date
    // Recharge: Start from now/today if customer is expired or inactive
    // Renew: Extend from current expiration date if customer is currently active
    let baseDate = new Date();
    const isCustomerActive = customer.status === "active" && customer.expireDate && new Date(customer.expireDate) > baseDate;

    if (isCustomerActive && renewBack) {
      baseDate = new Date(customer.expireDate!);
    }

    let newExpireDate = new Date(baseDate);
    const numDuration = Number(duration) || 1;

    if (billingType === "monthly") {
      newExpireDate.setDate(newExpireDate.getDate() + numDuration * 30);
    } else {
      newExpireDate.setDate(newExpireDate.getDate() + numDuration);
    }

    // If Reseller, deduct balance
    if (session.role === "reseller" && reseller) {
      const currentBalance = Number(reseller.walletBalance || 0);
      await db.update(users)
        .set({ walletBalance: String((currentBalance - Number(amount)).toFixed(2)) })
        .where(eq(users.id, reseller.id));
      
      // Log transaction record
      await db.insert(transactions).values({
        resellerId: session.userId,
        customerId: customer.id,
        amount: String(amount),
        type: "recharge",
      });
    } else if (session.role === "admin") {
      // Log admin transaction
      await db.insert(transactions).values({
        resellerId: session.userId, // Admin ID
        customerId: customer.id,
        amount: String(amount),
        type: "recharge",
      });
    }

    // Update customer in database
    const currentBalance = Number(customer.balance || 0);
    const newBalance = currentBalance - (Number(due) || 0);
    await db.update(users)
      .set({
        expireDate: newExpireDate,
        status: "active",
        balance: String(newBalance.toFixed(2))
      })
      .where(eq(users.id, customer.id));

    // Record the payment
    await db.insert(payments).values({
      userId: customer.id,
      amount: String(amount),
      method: session.role === "reseller" ? "reseller_wallet" : (method || "Hand Cash"),
      status: "approved",
      trxId: `REC-${Date.now().toString().slice(-6)}`,
      screenshotUrl: note ? `Note: ${note}` : null
    });

    // Record the invoice as paid
    await db.insert(invoices).values({
      userId: customer.id,
      amount: String(amount),
      status: "paid",
      dueDate: newExpireDate
    });

    // Sync status and expiry to MikroTik router
    if (customer.pppoeUsername) {
      await syncCustomerToMikrotik(
        customer.pppoeUsername,
        undefined, // password stays same
        customer.packageId,
        "active"
      );
    }

    return NextResponse.json({
      success: true,
      message: `Recharged successfully! Expire Date set to ${newExpireDate.toLocaleString()}`
    });
  } catch (err) {
    console.error("Advanced recharge error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
