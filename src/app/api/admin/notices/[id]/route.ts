import { NextResponse } from "next/server";
import { db } from "@/db";
import { notices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const noticeId = Number(id);
    if (isNaN(noticeId)) {
      return NextResponse.json({ error: "Invalid notice ID" }, { status: 400 });
    }

    await db.delete(notices).where(eq(notices.id, noticeId));

    return NextResponse.json({ success: true, message: "Notice deleted successfully" });
  } catch (error) {
    console.error("Error deleting notice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const noticeId = Number(id);
    if (isNaN(noticeId)) {
      return NextResponse.json({ error: "Invalid notice ID" }, { status: 400 });
    }

    const body = await req.json();
    const { title, message, type, imageUrl } = body;

    await db.update(notices)
      .set({ title, message, type, imageUrl, updatedAt: new Date() })
      .where(eq(notices.id, noticeId));

    return NextResponse.json({ success: true, message: "Notice updated successfully" });
  } catch (error) {
    console.error("Error updating notice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
