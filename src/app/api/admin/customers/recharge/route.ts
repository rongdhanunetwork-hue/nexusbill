import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, payments, invoices, packages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    const customer = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: { package: true }
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const price = customer.package?.price ? String(customer.package.price) : "0.00";
    const durationDays = customer.package?.durationDays || 30;

    // Calculate new expire date. If current expire date is in the future, extend it.
    // Otherwise, start from now.
    let baseDate = new Date();
    if (customer.expireDate && new Date(customer.expireDate) > new Date()) {
      baseDate = new Date(customer.expireDate);
    }
    const newExpireDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Perform database operations in transaction
    await db.transaction(async (tx) => {
      // 1. Update user status and expireDate
      await tx
        .update(users)
        .set({
          status: "active",
          expireDate: newExpireDate
        })
        .where(eq(users.id, userId));

      // 2. Insert payment
      await tx.insert(payments).values({
        userId,
        amount: price,
        method: "admin_cash",
        trxId: `ADM-${Date.now()}`,
        status: "approved"
      });

      // 3. Insert paid invoice
      await tx.insert(invoices).values({
        userId,
        amount: price,
        status: "paid",
        dueDate: newExpireDate
      });
    });

    // Sync status to MikroTik router
    if (customer.pppoeUsername) {
      const { syncCustomerToMikrotik } = await import("@/lib/sync");
      await syncCustomerToMikrotik(
        customer.pppoeUsername,
        undefined, // password stays same
        customer.packageId,
        "active",
        customer.mikrotikId
      );
    }

    return NextResponse.json({
      success: true,
      message: `Recharged customer "${customer.name}" for ${durationDays} days successfully.`,
      newExpireDate: newExpireDate.toLocaleDateString()
    });
  } catch (err) {
    console.error("Recharge error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
