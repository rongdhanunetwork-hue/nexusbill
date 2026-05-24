import { NextResponse } from "next/server";
import { db } from "@/db";
import { packages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if (body.name) updateData.name = body.name.trim();
  if (body.speed) updateData.speed = body.speed.trim();
  if (body.price !== undefined) updateData.price = String(body.price);
  if (body.durationDays !== undefined) updateData.durationDays = Number(body.durationDays);

  const [updated] = await db.update(packages).set(updateData).where(eq(packages.id, Number(id))).returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(packages).where(eq(packages.id, Number(id)));
  return NextResponse.json({ success: true });
}
