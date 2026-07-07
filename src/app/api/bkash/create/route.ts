import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, invoices } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const amount = body.amount;
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
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
        "password": password
      },
      body: JSON.stringify({
        app_key,
        app_secret
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.id_token) {
      console.error("bKash Token Error:", tokenData);
      return NextResponse.json({ error: "Failed to authenticate with bKash" }, { status: 500 });
    }

    // Step 2: Create Payment
    const intent = "sale";
    const invoiceNumber = `INV-${Date.now()}-${session.userId}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    
    const createRes = await fetch(`${base_url}/tokenized/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": tokenData.id_token,
        "X-APP-Key": app_key
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: session.userId.toString(),
        callbackURL: `${baseUrl}/api/bkash/execute`,
        amount: amount.toString(),
        currency: "BDT",
        intent: intent,
        merchantInvoiceNumber: invoiceNumber
      })
    });

    const createData = await createRes.json();
    if (createData.statusCode !== "0000" || !createData.bkashURL) {
      console.error("bKash Create Error:", createData);
      return NextResponse.json({ error: createData.statusMessage || "Failed to create payment" }, { status: 500 });
    }

    // Create a pending payment record
    await db.insert(payments).values({
      userId: session.userId,
      amount: amount.toString(),
      trxId: createData.paymentID, // Temporarily store paymentID in trxId
      method: "bkash_auto",
      status: "pending"
    });

    return NextResponse.json({ bkashURL: createData.bkashURL });

  } catch (error) {
    console.error("bKash API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
