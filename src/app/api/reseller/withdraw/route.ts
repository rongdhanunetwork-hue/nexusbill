import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { withdrawalRequests, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/reseller/withdraw — fetch logged-in reseller's withdrawal requests
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "reseller") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db.query.withdrawalRequests.findMany({
      where: eq(withdrawalRequests.resellerId, session.userId),
      orderBy: [desc(withdrawalRequests.createdAt)],
    });
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/reseller/withdraw — submit a new withdrawal request
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "reseller") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { amount, method, account, note } = await req.json();

    const withdrawAmount = Number(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return NextResponse.json({ error: "Invalid withdrawal amount" }, { status: 400 });
    }

    if (!method || !account) {
      return NextResponse.json({ error: "Payment method and account info are required" }, { status: 400 });
    }

    // Fetch current reseller to check wallet balance
    const reseller = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!reseller) {
      return NextResponse.json({ error: "Reseller account not found" }, { status: 404 });
    }

    const currentBalance = Number(reseller.walletBalance || 0);
    if (withdrawAmount > currentBalance) {
      return NextResponse.json({
        error: `Insufficient wallet balance. You currently have ৳${currentBalance.toFixed(2)}`
      }, { status: 400 });
    }

    // Insert pending withdrawal request
    const [newRequest] = await db.insert(withdrawalRequests).values({
      resellerId: session.userId,
      amount: String(withdrawAmount),
      method,
      account,
      status: "pending",
      note: note || "",
    }).returning();

    return NextResponse.json({ success: true, request: newRequest });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
