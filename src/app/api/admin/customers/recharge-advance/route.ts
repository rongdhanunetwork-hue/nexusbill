import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, payments, invoices, packages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { syncCustomerToMikrotik } from "@/lib/sync";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, amount, billingType, duration, method, discount, note } = body;

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

    // Calculate new expiration date
    let baseDate = new Date();
    if (customer.expireDate) {
      const currentExpire = new Date(customer.expireDate);
      if (currentExpire > baseDate) {
        baseDate = currentExpire;
      }
    }

    let newExpireDate = new Date(baseDate);
    const numDuration = Number(duration) || 1;

    if (billingType === "monthly") {
      newExpireDate.setDate(newExpireDate.getDate() + numDuration * 30);
    } else {
      newExpireDate.setDate(newExpireDate.getDate() + numDuration);
    }

    // Update customer in database
    await db.update(users)
      .set({
        expireDate: newExpireDate,
        status: "active"
      })
      .where(eq(users.id, customer.id));

    // Record the payment
    await db.insert(payments).values({
      userId: customer.id,
      amount: String(amount),
      method: method || "Hand Cash",
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
      message: `Recharged successfully! Expire Date extended to ${newExpireDate.toLocaleDateString()}`
    });
  } catch (err) {
    console.error("Advanced recharge error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
