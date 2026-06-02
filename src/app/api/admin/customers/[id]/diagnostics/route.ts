import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const customerId = Number(id);
  
  if (!customerId) return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });

  try {
    const customer = await db.query.users.findFirst({
      where: eq(users.id, customerId),
      columns: { status: true, pppoeUsername: true, onuMac: true }
    });

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const isOnline = customer.status === "active" || customer.status === "online";
    
    // Simulate real hardware readout logic for demonstration
    // In a real system, you'd fetch this from OLT via SNMP/API here
    
    let rxPower = "-35.0";
    let txPower = "0.0";
    let temperature = "—";
    let voltage = "—";
    let uptime = "—";
    let distance = "—";
    let routerModel = "Unknown";

    if (isOnline) {
      const rxVal = -18.0 - ((customerId * 1.7) % 9.5);
      const txVal = 1.5 + ((customerId * 0.3) % 2.0);
      
      rxPower = rxVal.toFixed(1);
      txPower = txVal.toFixed(1);
      temperature = (30 + ((customerId * 2.3) % 15)).toFixed(1);
      voltage = (3.1 + ((customerId * 0.1) % 0.4)).toFixed(1);
      distance = (0.2 + ((customerId * 0.15) % 1.5)).toFixed(2) + " km";
      
      const uptimeDays = (customerId % 20) + 1;
      const uptimeHours = (customerId * 7) % 24;
      uptime = `${uptimeDays} days, ${uptimeHours} hours`;

      const routers = ["Tenda AC1200", "TP-Link Archer C6", "Netgear Nighthawk", "Xiaomi Mi Router 4A", "Mercusys MW302R"];
      routerModel = routers[customerId % routers.length];
    }

    return NextResponse.json({
      isOnline,
      rxPower,
      txPower,
      temperature,
      voltage,
      uptime,
      distance,
      routerModel,
      onuMac: customer.onuMac || `ONU${customerId.toString(16).padStart(8, "0").toUpperCase()}`
    });

  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
