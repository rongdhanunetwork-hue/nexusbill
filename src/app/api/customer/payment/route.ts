import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

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

    const [payment] = await db.insert(payments).values({
      userId: session.userId,
      amount: String(amount),
      trxId: trxId.trim().toUpperCase(),
      method,
      screenshotUrl: screenshotUrl?.trim() || null,
      status: "pending",
    }).returning();

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
