import { NextResponse } from "next/server";
import { db } from "@/db";
import { olts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const olt = await db.query.olts.findFirst({ where: eq(olts.id, Number(id)) });
  if (!olt) return NextResponse.json({ error: "OLT not found" }, { status: 404 });
  return NextResponse.json(olt);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const updateData: Record<string, any> = {};

    if (body.name) updateData.name = body.name.trim();
    if (body.ipAddress) updateData.ipAddress = body.ipAddress.trim();
    if (body.portCount !== undefined) updateData.portCount = Number(body.portCount);
    if (body.status !== undefined) updateData.status = Boolean(body.status);

    const [updated] = await db.update(olts).set(updateData).where(eq(olts.id, Number(id))).returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Update OLT error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(olts).where(eq(olts.id, Number(id)));
  return NextResponse.json({ success: true });
}
