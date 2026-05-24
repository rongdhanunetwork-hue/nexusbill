import { NextResponse } from "next/server";
import { db } from "@/db";
import { mikrotiks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const router = await db.query.mikrotiks.findFirst({ where: eq(mikrotiks.id, Number(id)) });
  if (!router) return NextResponse.json({ error: "Router not found" }, { status: 404 });
  return NextResponse.json(router);
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
    if (body.apiPort !== undefined) updateData.apiPort = Number(body.apiPort);
    if (body.username) updateData.username = body.username.trim();
    if (body.password) updateData.password = body.password.trim();
    if (body.status !== undefined) updateData.status = Boolean(body.status);

    const [updated] = await db.update(mikrotiks).set(updateData).where(eq(mikrotiks.id, Number(id))).returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Update router error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(mikrotiks).where(eq(mikrotiks.id, Number(id)));
  return NextResponse.json({ success: true });
}
