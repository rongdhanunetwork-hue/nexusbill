import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, users, tickets } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [paymentsCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(payments)
      .where(eq(payments.status, "pending"));

    const [approvalCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(users)
      .where(sql`${users.role} = 'customer' and ${users.approvalStatus} = 'pending'`);

    const [ticketsCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(tickets)
      .where(eq(tickets.status, "open"));

    const notifications = [];

    if (paymentsCount?.count > 0) {
      notifications.push({
        id: "pending-payments",
        text: `৳ ${paymentsCount.count} payment verification(s) pending`,
        link: "/admin/billing",
      });
    }

    if (approvalCount?.count > 0) {
      notifications.push({
        id: "pending-approvals",
        text: `${approvalCount.count} new registration(s) pending approval`,
        link: "/admin/customers?status=pending_approval",
      });
    }

    if (ticketsCount?.count > 0) {
      notifications.push({
        id: "open-tickets",
        text: `${ticketsCount.count} support ticket(s) unresolved`,
        link: "/admin/tickets",
      });
    }

    return NextResponse.json(notifications);
  } catch (err) {
    console.error("Admin notifications error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
