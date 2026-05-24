import { NextResponse } from "next/server";
import { db } from "@/db";
import { notices } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "reseller") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notifications = [];

    // Latest Notices
    const latestNotices = await db.query.notices.findMany({
      orderBy: [desc(notices.createdAt)],
      limit: 3,
    });

    for (const notice of latestNotices) {
      notifications.push({
        id: `notice-${notice.id}`,
        text: `Notice: ${notice.title}`,
        link: "/reseller/support",
      });
    }

    return NextResponse.json(notifications);
  } catch (err) {
    console.error("Reseller notifications error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
