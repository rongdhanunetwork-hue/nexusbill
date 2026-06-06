import { NextResponse } from "next/server";
import { db } from "@/db";
import { olts, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession, getAdminIdForSession } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
  const olt = await db.query.olts.findFirst({ where: eq(olts.id, Number(id)) });
  if (!olt) return NextResponse.json({ error: "OLT not found" }, { status: 404 });

  // Admin isolation check
  if (olt.adminId !== adminId) {
    return NextResponse.json({ error: "Forbidden: Not your OLT" }, { status: 403 });
  }

  // Reseller check
  if (session.role === "reseller" && olt.resellerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(olt);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminId = await getAdminId(session);
    const { id } = await params;
    const oltId = Number(id);

    const existing = await db.query.olts.findFirst({ where: eq(olts.id, oltId) });
    if (!existing) return NextResponse.json({ error: "OLT not found" }, { status: 404 });

    // Admin isolation check
    if (existing.adminId !== adminId) {
      return NextResponse.json({ error: "Forbidden: Not your OLT" }, { status: 403 });
    }

    // Reseller check
    if (session.role === "reseller" && existing.resellerId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updateData: Record<string, any> = {};

    if (body.name) updateData.name = body.name.trim();
    if (body.ipAddress) updateData.ipAddress = body.ipAddress.trim();
    if (body.portCount !== undefined) updateData.portCount = Number(body.portCount);
    if (body.connectionPort !== undefined) updateData.connectionPort = Number(body.connectionPort);
    if (body.status !== undefined) updateData.status = Boolean(body.status);
    if (body.username !== undefined) updateData.username = body.username?.trim() || null;
    if (body.password !== undefined) updateData.password = body.password || null;
    if (body.webPort !== undefined) updateData.webPort = Number(body.webPort);
    if (body.protocol !== undefined) updateData.protocol = body.protocol;
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.snmpCommunity !== undefined) updateData.snmpCommunity = body.snmpCommunity;
    if (body.timeout !== undefined) updateData.timeout = Number(body.timeout);

    const [updated] = await db.update(olts).set(updateData).where(eq(olts.id, oltId)).returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Update OLT error:", err);
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
  const oltId = Number(id);

  const existing = await db.query.olts.findFirst({ where: eq(olts.id, oltId) });
  if (!existing) return NextResponse.json({ error: "OLT not found" }, { status: 404 });

  // Admin isolation check
  if (existing.adminId !== adminId) {
    return NextResponse.json({ error: "Forbidden: Not your OLT" }, { status: 403 });
  }

  // Reseller check
  if (session.role === "reseller" && existing.resellerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(olts).where(eq(olts.id, oltId));
  return NextResponse.json({ success: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const oltId = Number(id);
    const olt = await db.query.olts.findFirst({ where: eq(olts.id, oltId) });
    if (!olt) return NextResponse.json({ error: "OLT not found" }, { status: 404 });

    // Admin isolation check
    const adminId = await getAdminId(session);
    if (olt.adminId !== adminId) {
      return NextResponse.json({ error: "Forbidden: Not your OLT" }, { status: 403 });
    }

    // Ping test
    const ip = olt.ipAddress;
    let ok = false;
    let errorMsg = "";

    try {
      // 1 second timeout ping
      const command = process.platform === "win32" ? `ping -n 1 -w 1000 ${ip}` : `ping -c 1 -W 1 ${ip}`;
      await execAsync(command);
      ok = true;
    } catch (err: any) {
      ok = false;
      errorMsg = err.message || "Ping timeout";
    }

    // Update status in db
    await db.update(olts).set({ status: ok }).where(eq(olts.id, oltId));

    return NextResponse.json({ success: true, ok, status: ok ? "online" : "offline", message: ok ? "OLT is online" : `OLT is offline: ${errorMsg}` });
  } catch (err) {
    console.error("Test OLT error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
