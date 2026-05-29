import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getPppoeActive } from "@/lib/mikrotik";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let customerQuery = db
      .select({ pppoeUsername: users.pppoeUsername, status: users.status, resellerId: users.resellerId })
      .from(users);

    let whereClause;
    if (session.role === "reseller") {
      whereClause = and(eq(users.role, "customer"), eq(users.resellerId, session.userId));
    } else {
      whereClause = eq(users.role, "customer");
    }

    const [allDbCustomers, activeSessions] = await Promise.all([
      customerQuery.where(whereClause),
      getPppoeActive().catch((err) => {
        console.error("Failed to fetch active sessions from MikroTik in dashboard API:", err);
        return [];
      }),
    ]);

    const activeCustomers = allDbCustomers.filter(c => c.status === "active");
    const activePppoeNames = activeSessions.map((s) => s.name);

    const onlineCustomers = activeCustomers.filter(c => {
      return c.pppoeUsername && activePppoeNames.includes(c.pppoeUsername);
    }).length;

    const offlineCustomers = Math.max(0, activeCustomers.length - onlineCustomers);

    return NextResponse.json({ onlineCustomers, offlineCustomers });
  } catch (err) {
    console.error("Dashboard active status route error:", err);
    return NextResponse.json({ onlineCustomers: 0, offlineCustomers: 0 });
  }
}
