import { NextResponse } from "next/server";
import { db } from "@/db";
import { smsLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

import { eq, inArray } from "drizzle-orm";

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

// DELETE /api/admin/sms-log — delete single, multiple, or all SMS logs
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    const idsStr = searchParams.get("ids");

    if (idStr) {
      const id = Number(idStr);
      if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      await db.delete(smsLogs).where(eq(smsLogs.id, id));
    } else if (idsStr) {
      const ids = idsStr.split(",").map(Number).filter((n) => !isNaN(n));
      if (ids.length > 0) {
        await db.delete(smsLogs).where(inArray(smsLogs.id, ids));
      }
    } else {
      await db.delete(smsLogs);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
