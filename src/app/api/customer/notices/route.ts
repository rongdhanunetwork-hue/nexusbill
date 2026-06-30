import { NextResponse } from "next/server";
import { db } from "@/db";
import { notices, users } from "@/db/schema";
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

    const latestNotices = await db.query.notices.findMany({
      where: eq(notices.adminId, customer.adminId || 1),
      orderBy: [desc(notices.createdAt)],
      limit: 5,
    });

    return NextResponse.json(latestNotices);
  } catch (err) {
    console.error("Customer notices error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
