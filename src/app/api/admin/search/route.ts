import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, packages, mikrotiks } from "@/db/schema";
import { eq, ilike, or, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return NextResponse.json([]);
  }

  const pattern = `%${q}%`;

  try {
    const [foundCustomers, foundPackages, foundRouters] = await Promise.all([
      db.select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        pppoeUsername: users.pppoeUsername
      })
      .from(users)
      .where(
        and(
          eq(users.role, "customer"),
          or(
            ilike(users.name, pattern),
            ilike(users.phone, pattern),
            ilike(users.pppoeUsername, pattern)
          )
        )
      )
      .limit(10),

      db.select({
        id: packages.id,
        name: packages.name,
        speed: packages.speed
      })
      .from(packages)
      .where(ilike(packages.name, pattern))
      .limit(5),

      db.select({
        id: mikrotiks.id,
        name: mikrotiks.name,
        ipAddress: mikrotiks.ipAddress
      })
      .from(mikrotiks)
      .where(ilike(mikrotiks.name, pattern))
      .limit(5)
    ]);

    const results = [
      ...foundCustomers.map(c => ({
        type: "customer",
        id: c.id,
        title: c.name,
        subtitle: `Phone: ${c.phone} ${c.pppoeUsername ? `| PPPoE: ${c.pppoeUsername}` : ""}`,
        url: `/admin/customers/${c.id}`
      })),
      ...foundPackages.map(p => ({
        type: "package",
        id: p.id,
        title: p.name,
        subtitle: `Speed: ${p.speed}`,
        url: `/admin/packages`
      })),
      ...foundRouters.map(r => ({
        type: "router",
        id: r.id,
        title: r.name,
        subtitle: `IP: ${r.ipAddress}`,
        url: `/admin/mikrotik`
      }))
    ];

    return NextResponse.json(results);
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
