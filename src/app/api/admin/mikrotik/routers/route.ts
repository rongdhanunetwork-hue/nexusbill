import { NextResponse } from "next/server";
import { db } from "@/db";
import { mikrotiks, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, isNull, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let adminId = session.userId;
  if (session.role === "reseller" || session.role === "employee") {
    const u = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { adminId: true }
    });
    adminId = u?.adminId || 1;
  }

  let routers;
  if (session.role === "reseller") {
    routers = await db.query.mikrotiks.findMany({
      where: and(eq(mikrotiks.resellerId, session.userId), eq(mikrotiks.adminId, adminId)),
    });
  } else {
    // Admin & Employees see Admin-level routers (where resellerId is NULL)
    routers = await db.query.mikrotiks.findMany({
      where: and(isNull(mikrotiks.resellerId), eq(mikrotiks.adminId, adminId)),
    });
  }
  return NextResponse.json(routers);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let adminId = session.userId;
  if (session.role === "reseller") {
    const u = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { adminId: true }
    });
    adminId = u?.adminId || 1;
  }

  const body = await req.json();
  const { name, ipAddress, apiPort, username, password } = body;

  if (!name || !ipAddress || !password) {
    return NextResponse.json({ error: "Name, IP, password required" }, { status: 400 });
  }

  const [router] = await db.insert(mikrotiks).values({
    name: name.trim(),
    ipAddress: ipAddress.trim(),
    apiPort: Number(apiPort) || 13065,
    username: username?.trim() || "admin",
    password: password.trim(),
    status: true,
    resellerId: session.role === "reseller" ? session.userId : null,
    adminId,
  }).returning();

  return NextResponse.json(router, { status: 201 });
}
