import { NextResponse } from "next/server";
import { db } from "@/db";
import { olts, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const oltId = Number(id);
  if (!oltId) {
    return NextResponse.json({ error: "Invalid OLT ID" }, { status: 400 });
  }

  try {
    const olt = await db.query.olts.findFirst({
      where: eq(olts.id, oltId),
    });

    if (!olt) {
      return NextResponse.json({ error: "OLT not found" }, { status: 404 });
    }

    if (session.role === "reseller" && olt.resellerId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch customers connected to this OLT
    const customers = await db.query.users.findMany({
      where: eq(users.oltId, oltId),
    });

    const onus = [];
    const portsCount = olt.portCount || 8;

    // 1. Generate ONUs for real customers
    customers.forEach((c) => {
      // Determine PON port pseudo-randomly
      const portNum = (c.id % portsCount) + 1;
      const isUserOnline = c.status === "active" || c.status === "online";
      
      let rxPower = "-35.0";
      let status = "offline";
      let uptime = "—";
      let temp = "—";
      let distance = "—";

      if (isUserOnline) {
        const powerVal = -18.0 - ((c.id * 1.7) % 9.5);
        rxPower = powerVal.toFixed(1);
        status = "online";
        temp = (30 + ((c.id * 2.3) % 15)).toFixed(1) + "°C";
        distance = (200 + ((c.id * 150) % 2500)) + "m";
        
        const uptimeDays = (c.id % 7) + 1;
        const uptimeHours = (c.id * 3) % 24;
        uptime = `${uptimeDays}d ${uptimeHours}h`;
      }

      onus.push({
        id: `real-${c.id}`,
        port: `PON-${portNum}`,
        macAddress: c.macAddress || `ONU${c.id.toString(16).padStart(8, "0").toUpperCase()}`,
        username: c.pppoeUsername || c.name,
        customerName: c.name,
        rxPower,
        status,
        uptime,
        temperature: temp,
        distance,
      });
    });

    // 2. Generate dummy ONUs
    const dummyCount = Math.max(10, portsCount * 3 - onus.length);
    for (let i = 0; i < dummyCount; i++) {
      const portNum = (i % portsCount) + 1;
      const status = i % 6 === 0 ? "offline" : "online";
      
      let rxPower = "-35.0";
      let temp = "—";
      let distance = "—";
      let uptime = "—";

      if (status === "online") {
        const powerVal = -17.5 - ((i * 2.9) % 11.2);
        rxPower = powerVal.toFixed(1);
        temp = (32 + ((i * 1.7) % 12)).toFixed(1) + "°C";
        distance = (0.3 + ((i * 0.4) % 3.2)).toFixed(2) + " km";
        uptime = `${(i % 12) + 1}d ${(i * 5) % 24}h`;
      }

      const macHex = (0x544543000000 + i * 257).toString(16).toUpperCase();

      onus.push({
        id: `dummy-${i}`,
        port: `PON-${portNum}`,
        macAddress: `FHTT${macHex.slice(-8)}`,
        username: `unassigned_onu_${i + 1}`,
        customerName: "Unassigned ONU",
        rxPower,
        status,
        uptime,
        temperature: temp,
        distance,
      });
    }

    // Sort onus by PON port, then online first, then MAC
    onus.sort((a, b) => {
      const portA = parseInt(a.port.split("-")[1]);
      const portB = parseInt(b.port.split("-")[1]);
      if (portA !== portB) return portA - portB;
      if (a.status !== b.status) return a.status === "online" ? -1 : 1;
      return a.macAddress.localeCompare(b.macAddress);
    });

    return NextResponse.json({
      oltName: olt.name,
      ipAddress: olt.ipAddress,
      connectionPort: olt.connectionPort,
      portCount: portsCount,
      onus,
    });
  } catch (err) {
    console.error("OLT ONUs API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
