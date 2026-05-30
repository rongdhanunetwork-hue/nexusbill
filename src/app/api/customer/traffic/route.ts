import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getPppoeTraffic } from "@/lib/mikrotik";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customer = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (!customer.pppoeUsername) {
      return NextResponse.json({ rxBps: 0, txBps: 0, isOnline: false });
    }

    const traffic = await getPppoeTraffic(customer.pppoeUsername, customer.mikrotikId || undefined);
    if (!traffic) {
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
    console.error("Customer Traffic API error:", err);
    return NextResponse.json({ rxBps: 0, txBps: 0, isOnline: false, error: String(err) });
  }
}
