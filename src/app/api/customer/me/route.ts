import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customer = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: {
        id: true,
        name: true,
        photoUrl: true,
        adminId: true,
      }
    });

    if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const adminSettings = await db.query.settings.findMany({
      where: eq(settings.adminId, customer.adminId || 1)
    });

    const sysSettings: Record<string, string> = {};
    for (const row of adminSettings) {
      if (row.key === "system_name" || row.key === "website_logo") {
        if (row.value != null) sysSettings[row.key] = row.value;
      }
    }

    return NextResponse.json({ ...customer, systemSettings: sysSettings });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
