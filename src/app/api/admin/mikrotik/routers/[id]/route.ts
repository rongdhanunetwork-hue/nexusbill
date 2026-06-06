import { NextResponse } from "next/server";
import { db } from "@/db";
import { mikrotiks, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession, getAdminIdForSession } from "@/lib/auth";
import { testConnection } from "@/lib/mikrotik";


async function getAdminId(session: any): Promise<number> {
  return getAdminIdForSession(session);
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminId = await getAdminId(session);
    const { id } = await params;
    const routerId = Number(id);

    const router = await db.query.mikrotiks.findFirst({ where: eq(mikrotiks.id, routerId) });
    if (!router) return NextResponse.json({ error: "Router not found" }, { status: 404 });

    // Admin isolation check
    if (router.adminId !== adminId) {
      return NextResponse.json({ error: "Forbidden: Not your router" }, { status: 403 });
    }

    const testRes = await testConnection(routerId);
    if (testRes.ok) {
      return NextResponse.json({ success: true, ok: true, version: testRes.version, message: `Connected successfully! RouterOS ${testRes.version}` });
    } else {
      return NextResponse.json({ success: true, ok: false, error: testRes.error, message: `Failed to connect: ${testRes.error}` });
    }
  } catch (err) {
    console.error("Test router connection error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

