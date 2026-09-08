import { NextResponse } from "next/server";
import { db } from "@/db";
import { customerRouters, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// GET: List all routers for a customer
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin" && session.role !== "employee")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const customerId = parseInt(resolvedParams.id, 10);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: "Invalid Customer ID" }, { status: 400 });
    }

    const routersList = await db.query.customerRouters.findMany({
      where: eq(customerRouters.userId, customerId),
      orderBy: (customerRouters, { desc }) => [desc(customerRouters.createdAt)],
    });

    return NextResponse.json(routersList);
  } catch (error) {
    console.error("Fetch customer routers error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Add a new router for a customer
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const customerId = parseInt(resolvedParams.id, 10);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: "Invalid Customer ID" }, { status: 400 });
    }

    const body = await req.json();
    const { model, ipAddress, macAddress, username, password, port, note } = body;

    if (!ipAddress) {
      return NextResponse.json({ error: "IP Address is required" }, { status: 400 });
    }

    const [newRouter] = await db.insert(customerRouters).values({
      userId: customerId,
      model: model || "Standard Wi-Fi Router",
      ipAddress: ipAddress.trim(),
      macAddress: macAddress ? macAddress.trim() : null,
      username: username ? username.trim() : "admin",
      password: password ? password.trim() : "admin",
      port: port ? parseInt(port, 10) : 80,
      note: note || null,
    }).returning();

    // Also update main router info on user profile for convenience
    await db.update(users).set({
      routerModel: model || "Wi-Fi Router",
      ipAddress: ipAddress.trim(),
      macAddress: macAddress ? macAddress.trim() : undefined,
      routerUsername: username ? username.trim() : undefined,
      routerPassword: password ? password.trim() : undefined,
    }).where(eq(users.id, customerId));

    return NextResponse.json({ success: true, router: newRouter });
  } catch (error) {
    console.error("Add customer router error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Remove a router
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const routerIdParam = url.searchParams.get("routerId");
    if (!routerIdParam) {
      return NextResponse.json({ error: "routerId query parameter required" }, { status: 400 });
    }

    const routerId = parseInt(routerIdParam, 10);
    await db.delete(customerRouters).where(eq(customerRouters.id, routerId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete customer router error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
