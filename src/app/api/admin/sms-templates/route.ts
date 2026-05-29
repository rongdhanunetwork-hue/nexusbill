import { NextResponse } from "next/server";
import { db } from "@/db";
import { smsTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/admin/sms-templates — fetch all SMS templates
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.query.smsTemplates.findMany();
  return NextResponse.json(rows);
}

// POST /api/admin/sms-templates — update or create an SMS template
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { key, template, description } = await req.json();

    if (!key || !template) {
      return NextResponse.json({ error: "Key and template content are required" }, { status: 400 });
    }

    const existing = await db.query.smsTemplates.findFirst({ where: eq(smsTemplates.key, key) });
    if (existing) {
      await db.update(smsTemplates)
        .set({ template, description })
        .where(eq(smsTemplates.key, key));
    } else {
      await db.insert(smsTemplates).values({ key, template, description });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
