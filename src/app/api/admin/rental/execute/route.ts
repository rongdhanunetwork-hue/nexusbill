import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, adminPaymentLogs, systemNotifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentID = url.searchParams.get("paymentID");
  const status = url.searchParams.get("status");
  const adminIdParam = url.searchParams.get("admin_id");

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
  const redirectUrl = new URL("/admin", baseUrl);

  if (!paymentID || status !== "success" || !adminIdParam) {
    redirectUrl.searchParams.set("rental_payment", "failed");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const adminId = parseInt(adminIdParam, 10);
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, adminId),
    });

    if (!adminUser) {
      redirectUrl.searchParams.set("rental_payment", "user_not_found");
      return NextResponse.redirect(redirectUrl);
    }

    const app_key = process.env.BKASH_APP_KEY;
    const app_secret = process.env.BKASH_APP_SECRET;
    const username = process.env.BKASH_USERNAME;
    const password = process.env.BKASH_PASSWORD;
    const base_url = process.env.BKASH_BASE_URL;

    // Grant Token
    const tokenRes = await fetch(`${base_url}/tokenized/checkout/token/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "username": username!,
        "password": password!,
      },
      body: JSON.stringify({ app_key, app_secret }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.id_token) {
      redirectUrl.searchParams.set("rental_payment", "auth_error");
      return NextResponse.redirect(redirectUrl);
    }

    // Execute Payment
    const executeRes = await fetch(`${base_url}/tokenized/checkout/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": tokenData.id_token,
        "X-APP-Key": app_key!,
      },
      body: JSON.stringify({ paymentID }),
    });

    const executeData = await executeRes.json();
    if (executeData.statusCode && executeData.statusCode !== "0000") {
      redirectUrl.searchParams.set("rental_payment", "execute_error");
      return NextResponse.redirect(redirectUrl);
    }

    // Calculate new expire date (+30 days)
    const now = new Date();
    const oldExpire = adminUser.expireDate ? new Date(adminUser.expireDate) : now;
    const baseDate = oldExpire > now ? oldExpire : now;

    const newExpireDate = new Date(baseDate);
    newExpireDate.setDate(newExpireDate.getDate() + 30);

    // 1. Update Admin status and expireDate
    await db.update(users)
      .set({
        status: "active",
        expireDate: newExpireDate,
      })
      .where(eq(users.id, adminUser.id));

    // 2. Log payment in adminPaymentLogs
    await db.insert(adminPaymentLogs).values({
      adminId: adminUser.id,
      amount: executeData.amount || "500",
      trxId: executeData.trxID || paymentID,
      method: "bkash",
      daysAdded: 30,
      oldExpireDate: oldExpire,
      newExpireDate: newExpireDate,
    });

    // 3. Send SMS notification to Admin
    if (adminUser.phone) {
      const smsMessage = `Dear ${adminUser.name}, your ISP Billing software rental payment of BDT ${executeData.amount || 500} via bKash (TrxID: ${executeData.trxID || paymentID}) is successful. Your new valid till: ${newExpireDate.toLocaleDateString('en-GB')}. Thank you!`;
      try {
        await sendSMS(adminUser.phone, smsMessage);
      } catch (e) {
        console.error("Failed to send rental renewal SMS:", e);
      }
    }

    // 4. Create System Notification for Super Admin & Admin
    try {
      await db.insert(systemNotifications).values({
        userId: adminUser.id,
        title: "Software Rental Renewed!",
        message: `Your monthly software subscription has been renewed successfully till ${newExpireDate.toLocaleDateString('en-GB')}. TrxID: ${executeData.trxID || paymentID}`,
        link: "/admin",
      });
    } catch (e) {
      console.error("Failed to insert system notification:", e);
    }

    redirectUrl.searchParams.set("rental_payment", "success");
    redirectUrl.searchParams.set("trxId", executeData.trxID || paymentID);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("bKash Rental Execute Error:", error);
    redirectUrl.searchParams.set("rental_payment", "error");
    return NextResponse.redirect(redirectUrl);
  }
}
