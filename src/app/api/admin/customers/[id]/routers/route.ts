import { NextResponse } from "next/server";
import { db } from "@/db";
import { customerRouters } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin" && session.role !== "reseller" && session.role !== "employee")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const customerId = Number(id);
    const body = await req.json();

    await db.insert(customerRouters).values({
      userId: customerId,
      model: body.model || "Unknown",
      ipAddress: body.ipAddress,
      macAddress: body.macAddress,
      username: body.username,
      password: body.password,
      port: Number(body.port) || 80,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Add router error:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin" && session.role !== "reseller" && session.role !== "employee")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const routerId = searchParams.get("routerId");
    
    if (!routerId) {
      return NextResponse.json({ error: "Router ID missing" }, { status: 400 });
    }

    await db.delete(customerRouters).where(eq(customerRouters.id, Number(routerId)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete router error:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
