import { NextResponse } from "next/server";
import { db } from "@/db";
import { tjBoxes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession, getAdminIdForSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminId = await getAdminIdForSession(session);
    let condition;
    
    if (session.role === "reseller") {
        condition = eq(tjBoxes.resellerId, session.userId);
    } else {
        condition = eq(tjBoxes.adminId, adminId);
    }

    const boxes = await db.query.tjBoxes.findMany({
      where: condition,
      orderBy: [desc(tjBoxes.id)],
    });
    return NextResponse.json(boxes);
  } catch (error) {
    console.error("GET tjBoxes error:", error);
    return NextResponse.json({ error: "Failed to fetch TJ boxes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminId = await getAdminIdForSession(session);
    const body = await req.json();
    const { name, address, portCount, status } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const [box] = await db.insert(tjBoxes).values({
      name: name.trim(),
      address: address?.trim() || null,
      portCount: portCount ? Number(portCount) : 8,
      status: status !== undefined ? Boolean(status) : true,
      adminId,
      resellerId: session.role === "reseller" ? session.userId : null,
    }).returning();

    return NextResponse.json(box);
  } catch (error) {
    console.error("POST tjBox error:", error);
    return NextResponse.json({ error: "Failed to create TJ box" }, { status: 500 });
  }
}
