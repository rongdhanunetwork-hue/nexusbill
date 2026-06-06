import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, mikrotiks } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getPppoeActive } from "@/lib/mikrotik";
import { getSession, getAdminIdForSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminId = await getAdminIdForSession(session);

    // Simple in-memory cache per admin/reseller to reduce router calls
    const globalCache = globalThis as any;
    if (!globalCache.__activeStatusCache) globalCache.__activeStatusCache = new Map<string, { ts: number; data: { onlineCustomers: number; offlineCustomers: number } }>();
    const cacheKey = `${adminId}-${session.role}-${session.userId}`;
    const cached = globalCache.__activeStatusCache.get(cacheKey);
    const CACHE_TTL = 10 * 1000; // 10 seconds
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    let customerQuery = db
      .select({ pppoeUsername: users.pppoeUsername, status: users.status, resellerId: users.resellerId })
      .from(users);

    let whereClause;
    if (session.role === "reseller") {
      whereClause = and(eq(users.role, "customer"), eq(users.resellerId, session.userId), eq(users.adminId, adminId));
    } else {
      whereClause = and(eq(users.role, "customer"), eq(users.adminId, adminId), isNull(users.resellerId));
    }

    // Fetch only the minimal fields to reduce payload
    const [allDbCustomers, routers] = await Promise.all([
      db.query.users.findMany({
        where: whereClause,
        columns: { pppoeUsername: true, status: true }
      }),
      db.select().from(mikrotiks).where(
        session.role === "reseller"
          ? and(eq(mikrotiks.resellerId, session.userId), eq(mikrotiks.status, true), eq(mikrotiks.adminId, adminId))
          : and(isNull(mikrotiks.resellerId), eq(mikrotiks.status, true), eq(mikrotiks.adminId, adminId))
      )
    ]);

    // Fetch active sessions from all relevant routers in parallel
    // Retry helper for transient router timeouts
    const fetchWithRetry = async (routerId?: number, attempts = 2) => {
      for (let i = 0; i < attempts; i++) {
        try {
          return await getPppoeActive(routerId);
        } catch (err) {
          console.error(`Attempt ${i+1} failed for router ${routerId}:`, err?.message || err);
          if (i < attempts - 1) await new Promise(r => setTimeout(r, 1000));
        }
      }
      return [];
    };

    const activeSessionsPromises = routers.map((r) => fetchWithRetry(r.id));

    if (adminId === 1) {
      activeSessionsPromises.push(fetchWithRetry(undefined));
    }

    const activeSessionsLists = await Promise.all(activeSessionsPromises);

    // Combine all active sessions and build lookups
    const activePppoeNames = new Set<string>();
    const activeByMac = new Set<string>();
    const activeByIp = new Set<string>();
    for (const list of activeSessionsLists) {
      for (const sess of list) {
        if (!sess) continue;
        if (sess.name) activePppoeNames.add(String(sess.name).toLowerCase());
        if (sess["caller-id"]) {
          const cleaned = String(sess["caller-id"]).replace(/[^0-9a-fA-F]/g, '').toUpperCase();
          if (cleaned.length >= 6) activeByMac.add(cleaned);
        }
        if (sess.address) {
          activeByIp.add(String(sess.address));
        }
      }
    }

    // Filter to only active customers
    const activeCustomers = allDbCustomers.filter(c => c.status === "active" || c.status === "online");
    
    // Normalize MAC helper
    const normMac = (m?: string | null) => (m || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();

    const onlineCustomers = activeCustomers.filter(c => {
      try {
        if (c.pppoeUsername && activePppoeNames.has(c.pppoeUsername.toLowerCase())) return true;
        const mac = normMac((c as any).onuMac || (c as any).macAddress || (c as any).mac || null);
        if (mac && activeByMac.has(mac)) return true;
        if ((c as any).ipAddress && activeByIp.has((c as any).ipAddress)) return true;
      } catch (e) {}
      return false;
    }).length;

    const offlineCustomers = Math.max(0, activeCustomers.length - onlineCustomers);

    const result = { onlineCustomers, offlineCustomers };
    try {
      globalCache.__activeStatusCache.set(cacheKey, { ts: Date.now(), data: result });
    } catch (e) {
      // ignore cache set failures
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Dashboard active status route error:", err);
    return NextResponse.json({ onlineCustomers: 0, offlineCustomers: 0 });
  }
}
