import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { mikrotiks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { RouterOSAPI } from "node-routeros";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const routerId = searchParams.get("routerId");

  if (!routerId) {
    return NextResponse.json({ error: "Router ID is required" }, { status: 400 });
  }

  try {
    const router = await db.query.mikrotiks.findFirst({
      where: eq(mikrotiks.id, Number(routerId))
    });

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }

    const api = new RouterOSAPI({
      host: router.ipAddress,
      user: router.username,
      password: router.password,
      port: router.apiPort || 8728,
      keepalive: true,
    });

    await api.connect();
    const pools = await api.write("/ip/pool/print");
    api.close();

    return NextResponse.json({ success: true, pools });
  } catch (error: any) {
    console.error("Fetch IP Pools error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { routerId, name, ranges } = await req.json();

    if (!routerId || !name || !ranges) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const router = await db.query.mikrotiks.findFirst({
      where: eq(mikrotiks.id, Number(routerId))
    });

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }

    const api = new RouterOSAPI({
      host: router.ipAddress,
      user: router.username,
      password: router.password,
      port: router.apiPort || 8728,
      keepalive: true,
    });

    await api.connect();
    await api.write("/ip/pool/add", [
      `=name=${name}`,
      `=ranges=${ranges}`
    ]);
    api.close();

    return NextResponse.json({ success: true, message: "IP Pool created successfully" });
  } catch (error: any) {
    console.error("Create IP Pool error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const routerId = searchParams.get("routerId");
  const poolId = searchParams.get("poolId");

  if (!routerId || !poolId) {
    return NextResponse.json({ error: "Router ID and Pool ID are required" }, { status: 400 });
  }

  try {
    const router = await db.query.mikrotiks.findFirst({
      where: eq(mikrotiks.id, Number(routerId))
    });

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }

    const api = new RouterOSAPI({
      host: router.ipAddress,
      user: router.username,
      password: router.password,
      port: router.apiPort || 8728,
      keepalive: true,
    });

    await api.connect();
    await api.write("/ip/pool/remove", [`=.id=${poolId}`]);
    api.close();

    return NextResponse.json({ success: true, message: "IP Pool deleted successfully" });
  } catch (error: any) {
    console.error("Delete IP Pool error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
