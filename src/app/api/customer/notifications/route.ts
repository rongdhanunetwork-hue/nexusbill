import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, notices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customer = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!customer) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const notifications = [];

    // 1. Expiration check
    if (customer.expireDate) {
      const daysLeft = Math.ceil((new Date(customer.expireDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft >= 0 && daysLeft <= 3) {
        notifications.push({
          id: "package-expiry",
          text: `আপনার প্যাকেজের মেয়াদ ${daysLeft} দিন পর শেষ হবে। দ্রুত রিচার্জ করুন!`,
          link: "/customer/pay-bill",
          type: "alert",
        });
      }
    }

    // 2. Latest Notices
    const latestNotices = await db.query.notices.findMany({
      where: eq(notices.adminId, customer.adminId || 1),
      orderBy: [desc(notices.createdAt)],
      limit: 3,
    });

    for (const notice of latestNotices) {
      notifications.push({
        id: `notice-${notice.id}`,
        text: `বিজ্ঞপ্তি: ${notice.title}`,
        link: "/customer",
        type: notice.type,
      });
    }

    return NextResponse.json(notifications);
  } catch (err) {
    console.error("Customer notifications error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
