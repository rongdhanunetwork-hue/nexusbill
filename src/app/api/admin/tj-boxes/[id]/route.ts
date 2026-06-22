import { NextResponse } from "next/server";
import { db } from "@/db";
import { tjBoxes, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, address, portCount, status } = body;

    const [updated] = await db.update(tjBoxes)
      .set({
        ...(name && { name: name.trim() }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(portCount !== undefined && { portCount: Number(portCount) }),
        ...(status !== undefined && { status: Boolean(status) }),
      })
      .where(
        session.role === "reseller" 
          ? and(eq(tjBoxes.id, Number(id)), eq(tjBoxes.resellerId, session.userId))
          : eq(tjBoxes.id, Number(id))
      )
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH tjBox error:", error);
    return NextResponse.json({ error: "Failed to update TJ box" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const boxId = Number(id);

    // Check if any users are connected to this box
    const connectedUsers = await db.query.users.findFirst({
        where: eq(users.tjBoxId, boxId)
    });

    if (connectedUsers) {
        return NextResponse.json({ error: "Cannot delete TJ box. It is currently assigned to one or more customers." }, { status: 400 });
    }

    const [deleted] = await db.delete(tjBoxes)
      .where(
        session.role === "reseller"
          ? and(eq(tjBoxes.id, boxId), eq(tjBoxes.resellerId, session.userId))
          : eq(tjBoxes.id, boxId)
      )
      .returning();

    if (!deleted) return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE tjBox error:", error);
    return NextResponse.json({ error: "Failed to delete TJ box" }, { status: 500 });
  }
}
