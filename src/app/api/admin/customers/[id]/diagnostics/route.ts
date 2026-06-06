import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getPppoeActive, getSystemResource } from "@/lib/mikrotik";

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
      columns: { status: true, pppoeUsername: true, onuMac: true, routerModel: true, ipAddress: true, macAddress: true }
    });

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const isOnline = customer.status === "active" || customer.status === "online";
    
    let rxPower = "-35.0";
    let txPower = "0.0";
    let temperature = "—";
    let voltage = "—";
    let uptime = "—";
    let distance = "—";
    let routerModel = customer.routerModel || "Unknown";
    // Determine vendor from routerModel or MAC OUI prefix
    function detectVendor(model: string | null, mac?: string | null) {
      const m = (model || '').toLowerCase();
      if (m.includes('mikrotik')) return 'MikroTik';
      if (m.includes('huawei')) return 'Huawei';
      if (m.includes('zte')) return 'ZTE';
      if (m.includes('ubnt') || m.includes('ubiquiti')) return 'Ubiquiti';
      if (m.includes('tp-link') || m.includes('tplink')) return 'TP-Link';
      if (m.includes('cisco')) return 'Cisco';
      if (m.includes('d-link') || m.includes('dlink')) return 'D-Link';
      if (m.includes('eltex')) return 'Eltex';
      // fallback to OUI if available
      if (mac) {
        const cleaned = mac.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
        if (cleaned.length >= 6) {
          const oui = cleaned.slice(0,6).match(/.{1,2}/g)?.join(':');
          if (oui) return `OUI ${oui}`;
        }
      }
      return 'Unknown';
    }

    let sessionMac: string | null = customer.onuMac || customer.macAddress || null;
    let sessionIp: string | null = customer.ipAddress || null;

    // If this customer is tied to a MikroTik instance and has a PPPoE username,
    // try to fetch the active PPPoE session to get the real caller-id (MAC) and IP.
    if (customer.mikrotikId && customer.pppoeUsername) {
      try {
        const active = await getPppoeActive(customer.mikrotikId);
        const match = (active || []).find(a => a.name === customer.pppoeUsername);
        if (match) {
          sessionMac = match["caller-id"] || sessionMac;
          sessionIp = match.address || sessionIp;
        }
      } catch (err) {
        // ignore router errors; fallback to DB values
      }

      // Also try to read router system resource for a more accurate router model
      try {
        const sys = await getSystemResource(customer.mikrotikId);
        if (sys && sys["board-name"]) routerModel = routerModel === 'Unknown' ? sys["board-name"] : routerModel;
      } catch (err) {
        // ignore
      }
    }

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

      // No fallback mock router model. Keep as in DB.
    }

    const routerVendor = detectVendor(customer.routerModel || null, sessionMac || customer.onuMac || customer.macAddress || null);

    return NextResponse.json({
      isOnline,
      rxPower,
      txPower,
      temperature,
      voltage,
      uptime,
      distance,
      routerModel,
      routerVendor,
      ipAddress: sessionIp || customer.ipAddress || null,
      onuMac: sessionMac || customer.onuMac || customer.macAddress || `ONU${customerId.toString(16).padStart(8, "0").toUpperCase()}`
    });

  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
