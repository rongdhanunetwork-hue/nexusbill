import { NextResponse } from "next/server";
import { db } from "@/db";
import { smsLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/admin/sms-log — fetch SMS log history
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await db.query.smsLogs.findMany({
      orderBy: [desc(smsLogs.sentAt)],
      limit: 100, // Limit to 100 latest SMS logs for performance
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
