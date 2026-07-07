import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemNotifications } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    const items = await db
      .select({
        id: systemNotifications.id,
        title: systemNotifications.title,
        message: systemNotifications.message,
        link: systemNotifications.link,
        isRead: systemNotifications.isRead,
        createdAt: systemNotifications.createdAt,
      })
      .from(systemNotifications)
      .where(eq(systemNotifications.userId, session.userId))
      .orderBy(desc(systemNotifications.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(systemNotifications)
      .where(eq(systemNotifications.userId, session.userId));
      
    const total = countResult?.count || 0;

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Notifications history error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
