import { NextResponse } from "next/server";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [ticketsCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(tickets)
      .where(eq(tickets.status, "open"));

    const notifications = [];

    if (ticketsCount?.count > 0) {
      notifications.push({
        id: "open-tickets",
        text: `${ticketsCount.count} support ticket(s) unresolved`,
        link: "/employee/tickets",
      });
    }

    return NextResponse.json(notifications);
  } catch (err) {
    console.error("Employee notifications error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
