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

    // Process Auto Recharge Logic
    let baseDate = new Date();
    const isCustomerActive = customer.status === "active" && customer.expireDate && new Date(customer.expireDate) > baseDate;
    if (isCustomerActive) {
      baseDate = new Date(customer.expireDate!);
    }
    
    let newExpireDate = new Date(baseDate);
    const durationDays = customer.package?.durationDays || 30;
    newExpireDate.setDate(newExpireDate.getDate() + durationDays);

    // Update customer DB
    await db.update(users)
      .set({
        expireDate: newExpireDate,
        status: "active",
      })
      .where(eq(users.id, customer.id));

    // Record Payment as auto-approved
    const [payment] = await db.insert(payments).values({
      userId: session.userId,
      amount: String(amount),
      trxId: trxId.trim().toUpperCase(),
      method,
      screenshotUrl: screenshotUrl?.trim() || null,
      status: "approved",
    }).returning();

    // Log transaction
    await db.insert(transactions).values({
      customerId: customer.id,
      resellerId: customer.resellerId || 1, // Fallback to 1 (Admin) if direct customer
      amount: String(amount),
      type: "recharge",
    });

    // Sync to Mikrotik to turn line on
    if (customer.pppoeUsername) {
      await syncCustomerToMikrotik(
        customer.pppoeUsername,
        undefined,
        customer.packageId,
        "active",
        customer.mikrotikId
      );
    }

    await insertAuditLog(customer.id, "CUSTOMER_AUTO_PAYMENT", `Payment ${trxId} auto-approved. Amount: ${amount}. New Expiry: ${newExpireDate.toLocaleString()}`);

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
