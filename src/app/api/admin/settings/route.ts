import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/admin/settings — fetch settings for the logged-in admin
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.query.settings.findMany({
    where: eq(settings.adminId, session.userId)
  });

  const map: Record<string, string> = {};
  for (const row of rows) {
    if (row.key && row.value != null) map[row.key] = row.value;
  }

  // SMS is global system. Non-default admins should see admin 1's SMS settings.
  if (session.userId !== 1) {
    const smsSettings = await db.query.settings.findMany({
      where: and(
        eq(settings.adminId, 1),
        sql`${settings.key} in ('sms_provider', 'sms_api_key', 'sms_sender_id', 'sms_test_phone')`
      )
    });
    for (const row of smsSettings) {
      if (row.key && row.value != null) map[row.key] = row.value;
    }
  }

  return NextResponse.json(map);
}

// POST /api/admin/settings — upsert one or many settings for the admin
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json(); // { key: value, ... }

  for (const [key, value] of Object.entries(body)) {
    const targetAdminId = ['sms_provider', 'sms_api_key', 'sms_sender_id', 'sms_test_phone'].includes(key) ? 1 : session.userId;
    const existing = await db.query.settings.findFirst({
      where: and(eq(settings.key, key), eq(settings.adminId, targetAdminId))
    });
    if (existing) {
      await db.update(settings).set({ value: String(value) }).where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({ key, value: String(value), adminId: targetAdminId });
    }
  }

  return NextResponse.json({ success: true });
}
