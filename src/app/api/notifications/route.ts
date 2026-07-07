import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemNotifications } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notifications = await db
      .select({
        id: systemNotifications.id,
        text: systemNotifications.title,
        message: systemNotifications.message,
        link: systemNotifications.link,
        isRead: systemNotifications.isRead,
        createdAt: systemNotifications.createdAt,
      })
      .from(systemNotifications)
      .where(
        and(
          eq(systemNotifications.userId, session.userId),
          eq(systemNotifications.isRead, false)
        )
      )
      .orderBy(desc(systemNotifications.createdAt))
      .limit(10);

    return NextResponse.json(notifications);
  } catch (err) {
    console.error("Notifications error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await db
      .update(systemNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(systemNotifications.id, id),
          eq(systemNotifications.userId, session.userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error marking notification read:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (id === "all") {
      await db.delete(systemNotifications).where(eq(systemNotifications.userId, session.userId));
      return NextResponse.json({ success: true });
    }

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await db
      .delete(systemNotifications)
      .where(
        and(
          eq(systemNotifications.id, Number(id)),
          eq(systemNotifications.userId, session.userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting notification:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
