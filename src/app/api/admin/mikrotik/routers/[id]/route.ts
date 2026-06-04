import { NextResponse } from "next/server";
import { db } from "@/db";
import { mikrotiks, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

async function getAdminId(session: any): Promise<number> {
  let adminId = session.userId;
  if (session.role === "reseller" || session.role === "employee") {
    const u = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { adminId: true }
    });
    adminId = u?.adminId || 1;
  }
  return adminId;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = await getAdminId(session);
  const { id } = await params;
  const router = await db.query.mikrotiks.findFirst({ where: eq(mikrotiks.id, Number(id)) });
  if (!router) return NextResponse.json({ error: "Router not found" }, { status: 404 });

  // Admin isolation check
  if (router.adminId !== adminId) {
    return NextResponse.json({ error: "Forbidden: Not your router" }, { status: 403 });
  }

  // Reseller check
  if (session.role === "reseller" && router.resellerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(router);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminId = await getAdminId(session);
    const { id } = await params;
    const routerId = Number(id);

    const existing = await db.query.mikrotiks.findFirst({ where: eq(mikrotiks.id, routerId) });
    if (!existing) return NextResponse.json({ error: "Router not found" }, { status: 404 });

    // Admin isolation check
    if (existing.adminId !== adminId) {
      return NextResponse.json({ error: "Forbidden: Not your router" }, { status: 403 });
    }

    // Reseller check
    if (session.role === "reseller" && existing.resellerId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updateData: Record<string, any> = {};

    if (body.name) updateData.name = body.name.trim();
    if (body.ipAddress) updateData.ipAddress = body.ipAddress.trim();
    if (body.apiPort !== undefined) updateData.apiPort = Number(body.apiPort);
    if (body.username) updateData.username = body.username.trim();
    if (body.password) updateData.password = body.password.trim();
    if (body.status !== undefined) updateData.status = Boolean(body.status);

    const [updated] = await db.update(mikrotiks).set(updateData).where(eq(mikrotiks.id, routerId)).returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Update router error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = await getAdminId(session);
  const { id } = await params;
  const routerId = Number(id);

  const existing = await db.query.mikrotiks.findFirst({ where: eq(mikrotiks.id, routerId) });
  if (!existing) return NextResponse.json({ error: "Router not found" }, { status: 404 });

  // Admin isolation check
  if (existing.adminId !== adminId) {
    return NextResponse.json({ error: "Forbidden: Not your router" }, { status: 403 });
  }

  // Reseller check
  if (session.role === "reseller" && existing.resellerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(mikrotiks).where(eq(mikrotiks.id, routerId));
  return NextResponse.json({ success: true });
}
