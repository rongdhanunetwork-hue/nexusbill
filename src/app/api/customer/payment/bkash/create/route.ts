import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { amount, invoiceId } = await req.json();

    if (!amount) {
      return NextResponse.json({ error: "Amount required" }, { status: 400 });
    }

    // MOCK: In a real integration, we would call bKash Create Payment API here
    // and receive a paymentID and bkashURL.
    
    const mockPaymentID = `BKASH-${Date.now()}`;
    const executeUrl = `/api/customer/payment/bkash/execute?paymentID=${mockPaymentID}&amount=${amount}&invoiceId=${invoiceId || ''}`;

    return NextResponse.json({
      paymentID: mockPaymentID,
      bkashURL: executeUrl, // In real world, this is a bKash hosted page URL
    });

  } catch (error) {
    console.error("bKash Create Payment Mock error:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
