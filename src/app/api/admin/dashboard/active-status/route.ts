import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, mikrotiks } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getPppoeActive } from "@/lib/mikrotik";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let adminId = session.userId;
    if (session.role === "reseller" || session.role === "employee") {
      const u = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        columns: { adminId: true }
      });
      adminId = u?.adminId || 1;
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

    const [allDbCustomers, routers] = await Promise.all([
      customerQuery.where(whereClause),
      db.select().from(mikrotiks).where(
        session.role === "reseller"
          ? and(eq(mikrotiks.resellerId, session.userId), eq(mikrotiks.status, true), eq(mikrotiks.adminId, adminId))
          : and(isNull(mikrotiks.resellerId), eq(mikrotiks.status, true), eq(mikrotiks.adminId, adminId))
      )
    ]);

    // Fetch active sessions from all relevant routers in parallel
    const activeSessionsPromises = routers.map((r) => 
      getPppoeActive(r.id).catch((err) => {
        console.error(`Failed to fetch active sessions from router ${r.id}:`, err);
        return [];
      })
    );

    if (adminId === 1) {
      activeSessionsPromises.push(
        getPppoeActive(undefined).catch((err) => {
          console.error(`Failed to fetch active sessions from default router:`, err);
          return [];
        })
      );
    }

    const activeSessionsLists = await Promise.all(activeSessionsPromises);

    // Combine all active session names
    const activePppoeNames = new Set<string>();
    for (const list of activeSessionsLists) {
      for (const sess of list) {
        if (sess.name) {
          activePppoeNames.add(sess.name.toLowerCase());
        }
      }
    }

    const onlineCustomers = allDbCustomers.filter(c => {
      return c.pppoeUsername && activePppoeNames.has(c.pppoeUsername.toLowerCase());
    }).length;

    const offlineCustomers = Math.max(0, allDbCustomers.length - onlineCustomers);

    return NextResponse.json({ onlineCustomers, offlineCustomers });
  } catch (err) {
    console.error("Dashboard active status route error:", err);
    return NextResponse.json({ onlineCustomers: 0, offlineCustomers: 0 });
  }
}
