import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, invoices, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const paymentID = url.searchParams.get("paymentID");
    const status = url.searchParams.get("status");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const protocol = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    
    // Determine redirect path for UI
    const redirectUrl = new URL("/customer/pay-bill", baseUrl);

    if (!paymentID || status !== "success") {
      redirectUrl.searchParams.set("bkash_status", status || "failed");
      return NextResponse.redirect(redirectUrl);
    }

    const app_key = process.env.BKASH_APP_KEY;
    const app_secret = process.env.BKASH_APP_SECRET;
    const username = process.env.BKASH_USERNAME;
    const password = process.env.BKASH_PASSWORD;
    const base_url = process.env.BKASH_BASE_URL;

    // Step 1: Re-authenticate to get a fresh token for execution
    const tokenRes = await fetch(`${base_url}/tokenized/checkout/token/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "username": username!,
        "password": password!
      },
      body: JSON.stringify({ app_key, app_secret })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.id_token) {
      redirectUrl.searchParams.set("bkash_status", "auth_error");
      return NextResponse.redirect(redirectUrl);
    }

    // Step 2: Execute Payment
    const executeRes = await fetch(`${base_url}/tokenized/checkout/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": tokenData.id_token,
        "X-APP-Key": app_key!
      },
      body: JSON.stringify({ paymentID })
    });

    const executeData = await executeRes.json();

    if (executeData.statusCode && executeData.statusCode !== "0000") {
      // Payment execution failed or already executed
      redirectUrl.searchParams.set("bkash_status", "execute_error");
      redirectUrl.searchParams.set("message", executeData.statusMessage || "Error");
      return NextResponse.redirect(redirectUrl);
    }

    // Payment Successful!
    // Verify trxID in db
    const pendingPayment = await db.query.payments.findFirst({
      where: and(eq(payments.trxId, paymentID), eq(payments.status, "pending"))
    });

    if (pendingPayment) {
      // Find the user to get their package and current expire date
      const customer = await db.query.users.findFirst({
        where: eq(users.id, pendingPayment.userId),
        with: { package: true }
      });

      if (customer) {
        // Process Auto Recharge Logic
        let baseDate = new Date();
        const isCustomerActive = customer.status === "active" && customer.expireDate && new Date(customer.expireDate) > baseDate;
        if (isCustomerActive) {
          baseDate = new Date(customer.expireDate!);
        }
        
        let newExpireDate = new Date(baseDate);
        const durationDays = customer.package?.durationDays || 30;
        newExpireDate.setDate(newExpireDate.getDate() + durationDays);
        const now = new Date();
        newExpireDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

        // Update user status and expire date
        await db.update(users)
          .set({ status: "active", expireDate: newExpireDate })
          .where(eq(users.id, customer.id));

        // Sync to Mikrotik
        if (customer.pppoeUsername) {
          try {
            const { syncCustomerToMikrotik } = await import("@/lib/sync");
            await syncCustomerToMikrotik(
              customer.pppoeUsername,
              undefined,
              customer.packageId,
              "active",
              customer.mikrotikId
            );
          } catch (e) {
            console.error("Failed to sync to mikrotik:", e);
          }
        }

        // Notify Admins
        try {
          const { createNotificationForAdmins } = await import("@/lib/notifications");
          await createNotificationForAdmins(
            "bKash Payment Received!",
            `${customer.name} just paid ৳${pendingPayment.amount} via bKash.`,
            `/admin/customers/${customer.id}`
          );
        } catch (e) {
          console.error("Failed to create notification:", e);
        }
      }

      // Update payment
      await db.update(payments)
        .set({ 
          status: "approved", 
          trxId: executeData.trxID, // actual bKash trxID
          method: "bkash_auto" 
        })
        .where(eq(payments.id, pendingPayment.id));

      // Mark any pending invoices as paid for this user
      await db.update(invoices)
        .set({ status: "paid" })
        .where(and(eq(invoices.userId, pendingPayment.userId), eq(invoices.status, "unpaid")));
    }

    redirectUrl.searchParams.set("bkash_status", "success");
    redirectUrl.searchParams.set("trxId", executeData.trxID || paymentID);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error("bKash Execute Error:", error);
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const protocol = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const redirectUrl = new URL("/customer/pay-bill", baseUrl);
    redirectUrl.searchParams.set("bkash_status", "server_error");
    return NextResponse.redirect(redirectUrl);
  }
}
