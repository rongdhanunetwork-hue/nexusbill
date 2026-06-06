import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, mikrotiks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { findDeviceAcrossRouters } from "@/lib/mikrotik";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { ip, mac } = body;
    if (!ip && !mac) return NextResponse.json({ error: "ip or mac required" }, { status: 400 });

    // 1) try local DB lookup first
    if (ip) {
      const u = await db.query.users.findFirst({ where: eq(users.ipAddress, String(ip)) });
      if (u && u.mikrotikId) {
        const r = await db.query.mikrotiks.findFirst({ where: eq(mikrotiks.id, u.mikrotikId) });
        if (r) return NextResponse.json({ found: true, source: "db-user", router: r, user: u });
      }
    }
    if (mac) {
      const u2 = await db.query.users.findFirst({ where: eq(users.macAddress, String(mac)) });
      if (u2 && u2.mikrotikId) {
        const r2 = await db.query.mikrotiks.findFirst({ where: eq(mikrotiks.id, u2.mikrotikId) });
        if (r2) return NextResponse.json({ found: true, source: "db-user", router: r2, user: u2 });
      }
    }

    // 2) search across known routers via MikroTik API (ARP/leases)
    const hit = await findDeviceAcrossRouters({ ip, mac });
    if (hit) return NextResponse.json({ found: true, source: "router-scan", result: hit });

    return NextResponse.json({ found: false });
  } catch (err) {
    console.error('resolve-router error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
