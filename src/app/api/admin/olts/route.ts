import { NextResponse } from "next/server";
import { db } from "@/db";
import { olts, users } from "@/db/schema";
import { desc, eq, isNull, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

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

  let allOlts;
  if (session.role === "reseller") {
    allOlts = await db.query.olts.findMany({
      where: and(eq(olts.resellerId, session.userId), eq(olts.adminId, adminId)),
      orderBy: [desc(olts.createdAt)],
    });
  } else {
    allOlts = await db.query.olts.findMany({
      where: and(isNull(olts.resellerId), eq(olts.adminId, adminId)),
      orderBy: [desc(olts.createdAt)],
    });
  }
  return NextResponse.json(allOlts);
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

  try {
    const body = await req.json();
    const { name, ipAddress, portCount, connectionPort } = body;

    if (!name || !ipAddress) {
      return NextResponse.json({ error: "Name and IP Address required" }, { status: 400 });
    }

    const [olt] = await db.insert(olts).values({
      name: name.trim(),
      ipAddress: ipAddress.trim(),
      portCount: Number(portCount) || 8,
      connectionPort: Number(connectionPort) || 23,
      status: true,
      resellerId: session.role === "reseller" ? session.userId : null,
      adminId,
    }).returning();

    return NextResponse.json(olt, { status: 201 });
  } catch (err) {
    console.error("Create OLT error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
