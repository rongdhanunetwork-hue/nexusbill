import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/admin/settings — fetch all settings as key/value map
export async function GET() {
  const rows = await db.query.settings.findMany();
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (row.key && row.value != null) map[row.key] = row.value;
  }
  return NextResponse.json(map);
}

// POST /api/admin/settings — upsert one or many settings
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json(); // { key: value, ... }

  for (const [key, value] of Object.entries(body)) {
    const existing = await db.query.settings.findFirst({ where: eq(settings.key, key) });
    if (existing) {
      await db.update(settings).set({ value: String(value) }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value: String(value) });
    }
  }

  return NextResponse.json({ success: true });
}
