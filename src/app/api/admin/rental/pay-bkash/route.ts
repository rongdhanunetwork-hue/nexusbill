import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const amount = body.amount || 500; // Default software monthly rent price

    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    const app_key = process.env.BKASH_APP_KEY;
    const app_secret = process.env.BKASH_APP_SECRET;
    const username = process.env.BKASH_USERNAME;
    const password = process.env.BKASH_PASSWORD;
    const base_url = process.env.BKASH_BASE_URL;

    if (!app_key || !app_secret || !username || !password || !base_url) {
      return NextResponse.json({ error: "bKash credentials not configured" }, { status: 500 });
    }

    // Step 1: Grant Token
    const tokenRes = await fetch(`${base_url}/tokenized/checkout/token/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "username": username,
        "password": password,
      },
      body: JSON.stringify({ app_key, app_secret }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.id_token) {
      console.error("bKash Token Error:", tokenData);
      return NextResponse.json({ error: "Failed to authenticate with bKash" }, { status: 500 });
    }

    // Step 2: Create Payment
    const intent = "sale";
    const invoiceNumber = `RENT-${Date.now()}-${adminUser.id}`;
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const protocol = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    const createRes = await fetch(`${base_url}/tokenized/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": tokenData.id_token,
        "X-APP-Key": app_key,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: adminUser.phone || `ADMIN-${adminUser.id}`,
        callbackURL: `${baseUrl}/api/admin/rental/execute?admin_id=${adminUser.id}`,
        amount: amount.toString(),
        currency: "BDT",
        intent: intent,
        merchantInvoiceNumber: invoiceNumber,
      }),
    });

    const createData = await createRes.json();
    if (createData.statusCode !== "0000" || !createData.bkashURL) {
      console.error("bKash Create Error:", createData);
      return NextResponse.json({ error: createData.statusMessage || "Failed to create payment" }, { status: 500 });
    }

    return NextResponse.json({ bkashURL: createData.bkashURL });
  } catch (error) {
    console.error("bKash Rental Pay Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
