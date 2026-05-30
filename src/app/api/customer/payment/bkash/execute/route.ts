import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, payments, invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { syncCustomerToMikrotik } from "@/lib/sync";
import { insertAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    // If not logged in, we might want to redirect to login, but for API let's return JSON or redirect to dashboard with error
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { searchParams } = new URL(req.url);
    const paymentID = searchParams.get("paymentID");
    const amount = searchParams.get("amount");
    const invoiceId = searchParams.get("invoiceId");

    if (!paymentID || !amount) {
      return NextResponse.redirect(new URL("/customer?error=Payment+Verification+Failed", req.url));
    }

    // MOCK: In a real integration, we call bKash Execute API here using paymentID.
    // Assuming success...

    const customer = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      with: { package: true }
    });

    if (!customer) {
      return NextResponse.redirect(new URL("/login", req.url));
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

    // Update DB
    await db.update(users)
      .set({
        expireDate: newExpireDate,
        status: "active",
      })
      .where(eq(users.id, customer.id));

    // Record Payment
    await db.insert(payments).values({
      userId: customer.id,
      amount: String(amount),
      method: "bkash_auto",
      status: "approved",
      trxId: paymentID,
      screenshotUrl: "Auto-generated via Gateway",
    });

    // Update Invoice if provided
    if (invoiceId) {
      await db.update(invoices)
        .set({ status: "paid" })
        .where(eq(invoices.id, Number(invoiceId)));
    }

    // Sync to Mikrotik
    if (customer.pppoeUsername) {
      await syncCustomerToMikrotik(
        customer.pppoeUsername,
        undefined,
        customer.packageId,
        "active"
      );
    }

    await insertAuditLog(customer.id, "CUSTOMER_AUTO_PAYMENT", `bKash Auto Payment successful. Amount: ${amount}. New Expiry: ${newExpireDate.toLocaleString()}`);

    return NextResponse.redirect(new URL(`/customer?success=Payment+Successful!+Your+connection+is+active.`, req.url));

  } catch (error) {
    console.error("bKash Execute Payment Mock error:", error);
    return NextResponse.redirect(new URL("/customer?error=Payment+Execution+Failed", req.url));
  }
}
