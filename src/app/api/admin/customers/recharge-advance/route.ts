import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, payments, invoices, packages, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { syncCustomerToMikrotik } from "@/lib/sync";
import { insertAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    let { userId, amount, due, billingType, duration, method, discount, note, renewBack, newPackageId, customBaseDate, customExpireDate } = body;

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

      // SECURITY HOTFIX: Prevent resellers from manipulating the amount field
      let expectedAmount = 0;
      const targetPackage = customer.package;
      if (targetPackage) {
         const pkgPrice = Number(targetPackage.price || 0);
         const numDuration = Number(duration) || 1;
         if (billingType === "monthly") {
            expectedAmount = pkgPrice * numDuration;
         } else {
            expectedAmount = (pkgPrice / 30) * numDuration;
         }
      }
      
      // Resellers MUST pay the actual calculated price. 
      // If they give a discount to the customer, they still pay the full wholesale/retail amount from their wallet.
      const finalAmountToDeduct = expectedAmount;

      if (balance < finalAmountToDeduct) {
        return NextResponse.json({ error: `Insufficient balance. You need at least ৳${finalAmountToDeduct.toFixed(2)}` }, { status: 400 });
      }
      
      // Override the frontend 'amount' with the secure backend calculated amount for the rest of the flow
      amount = finalAmountToDeduct;
    }

    // Calculate new expiration date
    let newExpireDate: Date;

    if (customExpireDate) {
      let d = customExpireDate;
      if (typeof d === 'string' && !d.includes('Z') && !d.includes('+')) d += '+06:00';
      newExpireDate = new Date(d);
    } else {
      let baseDate = new Date();
      if (customBaseDate) {
        let d = customBaseDate;
        if (typeof d === 'string' && !d.includes('Z') && !d.includes('+')) d += '+06:00';
        baseDate = new Date(d);
      } else {
        const isCustomerActive = customer.status === "active" && customer.expireDate && new Date(customer.expireDate) > baseDate;
        if (isCustomerActive && renewBack) {
          baseDate = new Date(customer.expireDate!);
        }
      }

      newExpireDate = new Date(baseDate);
      const numDuration = Number(duration) || 1;

      let daysToAdd = 0;
      if (billingType === "monthly") {
        daysToAdd = numDuration * 30;
      } else {
        daysToAdd = numDuration;
      }
      
      newExpireDate.setDate(newExpireDate.getDate() + (daysToAdd - 1));
      newExpireDate.setHours(23, 59, 59, 999);
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
    const updateFields: any = {
      expireDate: newExpireDate,
      status: "active",
      balance: String(newBalance.toFixed(2)),
    };
    if (body.autoRenew !== undefined) {
      updateFields.autoRenew = Boolean(body.autoRenew);
    }
    // If admin selected a new package, change it
    if (newPackageId && session.role === "admin") {
      const newPkg = await db.query.packages.findFirst({
        where: eq(packages.id, Number(newPackageId)),
      });
      if (newPkg) {
        updateFields.packageId = newPkg.id;
      }
    }
    await db.update(users)
      .set(updateFields)
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
        updateFields.packageId || customer.packageId,
        "active",
        customer.mikrotikId
      );
    }

    await insertAuditLog(session.userId, "RECHARGE_CUSTOMER", `Recharged customer ${customer.name} with amount ${amount}. New expiry: ${newExpireDate.toLocaleString()}`);

    return NextResponse.json({
      success: true,
      message: `Recharged successfully! Expire Date set to ${newExpireDate.toLocaleString()}`
    });
  } catch (err) {
    console.error("Advanced recharge error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
