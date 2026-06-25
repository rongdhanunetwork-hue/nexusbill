import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, payments, transactions, invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { insertAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, amount, method, note } = body;

    if (!userId || amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "User ID and a valid positive amount are required" }, { status: 400 });
    }

    const customer = await db.query.users.findFirst({
      where: eq(users.id, Number(userId))
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Security: Reseller can only collect due from their own customers
    if (session.role === "reseller" && customer.resellerId !== session.userId) {
      return NextResponse.json({ error: "Unauthorized: Customer is not assigned to you" }, { status: 403 });
    }

    const paymentAmount = Number(amount);
    
    // Calculate new balance
    // If balance is -500 (Due), paying 500 makes it 0. 
    // If paying 600, makes it 100 (Advance).
    const currentBalance = Number(customer.balance || 0);
    const newBalance = currentBalance + paymentAmount;

    // Update customer balance in database
    await db.update(users)
      .set({ balance: String(newBalance.toFixed(2)) })
      .where(eq(users.id, customer.id));

    // Record the payment
    await db.insert(payments).values({
      userId: customer.id,
      amount: String(paymentAmount),
      method: method || "Hand Cash",
      status: "approved",
      trxId: `DUE-${Date.now().toString().slice(-6)}`,
      screenshotUrl: note ? `Note: ${note}` : "Due Collection"
    });

    // Mark all unpaid/due invoices as paid since the due is cleared
    await db.update(invoices)
      .set({ status: "paid" })
      .where(eq(invoices.userId, customer.id));

    // Record transaction
    await db.insert(transactions).values({
      resellerId: session.userId,
      customerId: customer.id,
      amount: String(paymentAmount),
      type: "recharge", // Use recharge type to indicate cash-in
    });

    await insertAuditLog(
      session.userId, 
      "DUE_COLLECTION", 
      `Collected due of ৳${paymentAmount} from customer ${customer.name}. New balance: ৳${newBalance.toFixed(2)}`
    );

    return NextResponse.json({
      success: true,
      message: `Due collected successfully! New Balance: ৳${newBalance.toFixed(2)}`
    });
  } catch (err) {
    console.error("Due collection error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
