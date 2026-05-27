import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getPppoeTraffic } from "@/lib/mikrotik";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const customerId = Number(id);
  if (!customerId) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const customer = await db.query.users.findFirst({
      where: eq(users.id, customerId),
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (!customer.pppoeUsername) {
      return NextResponse.json({ rxBps: 0, txBps: 0, isOnline: false });
    }

    const traffic = await getPppoeTraffic(customer.pppoeUsername);
    if (!traffic) {
      // Return 0 if not active/online on router
      return NextResponse.json({ rxBps: 0, txBps: 0, isOnline: false });
    }

    return NextResponse.json({
      rxBps: traffic.rxBps,
      txBps: traffic.txBps,
      bytesIn: traffic.bytesIn || 0,
      bytesOut: traffic.bytesOut || 0,
      isOnline: true
    });
  } catch (err) {
    console.error("Traffic API error:", err);
    return NextResponse.json({ rxBps: 0, txBps: 0, isOnline: false, error: String(err) });
  }
}
