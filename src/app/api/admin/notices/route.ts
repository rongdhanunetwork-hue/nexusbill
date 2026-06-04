import { NextResponse } from "next/server";
import { db } from "@/db";
import { notices } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allNotices = await db.query.notices.findMany({
    where: eq(notices.adminId, session.userId),
    orderBy: [desc(notices.createdAt)]
  });
  return NextResponse.json(allNotices);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, message, type, imageUrl } = await req.json();
  if (!title || !message) {
    return NextResponse.json({ error: "Title and message required" }, { status: 400 });
  }

  const [notice] = await db.insert(notices).values({
    title: title.trim(),
    message: message.trim(),
    type: type || "general",
    imageUrl: imageUrl || null,
    adminId: session.userId,
  }).returning();

  return NextResponse.json(notice, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.delete(notices).where(and(eq(notices.id, Number(id)), eq(notices.adminId, session.userId)));
  return NextResponse.json({ success: true });
}
