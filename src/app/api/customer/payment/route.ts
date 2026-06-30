import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, users, transactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { syncCustomerToMikrotik } from "@/lib/sync";
import { insertAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    const { trxId, amount, method, screenshotUrl } = await req.json();

    if (!trxId || trxId.length < 5 || !amount || !method) {
      return NextResponse.json({ error: "Transaction ID, amount, and method required" }, { status: 400 });
    }

    // Fetch customer to calculate new expiry
    const customer = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      with: { package: true }
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Amount validation
    const packagePrice = parseFloat(customer.package?.price || "0");
    const paidAmount = parseFloat(amount);
    
    if (paidAmount !== packagePrice) {
      return NextResponse.json({ error: `Amount mismatch. You must pay exactly ৳${packagePrice} for your package.` }, { status: 400 });
    }

    // Transaction ID uniqueness check
    const existingPayment = await db.query.payments.findFirst({
      where: eq(payments.trxId, trxId.trim().toUpperCase())
    });

    if (existingPayment) {
      return NextResponse.json({ error: "This Transaction ID has already been used!" }, { status: 400 });
    }

    // Insert Payment as pending
    const [payment] = await db.insert(payments).values({
      userId: session.userId,
      amount: String(amount),
      trxId: trxId.trim().toUpperCase(),
      method,
      screenshotUrl: screenshotUrl?.trim() || null,
      status: "pending",
    }).returning();

    await insertAuditLog(customer.id, "CUSTOMER_MANUAL_PAYMENT", `Payment ${trxId} submitted as pending. Amount: ${amount}.`);

    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    console.error("Payment submit error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const history = await db.query.payments.findMany({
    where: eq(payments.userId, session.userId),
    orderBy: [desc(payments.createdAt)],
  });

  return NextResponse.json(history);
}
