import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceCategories, serviceLinks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET all categories with their links
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await db.query.serviceCategories.findMany({
    where: eq(serviceCategories.adminId, session.userId),
    orderBy: [asc(serviceCategories.sortOrder)],
    with: { links: { where: eq(serviceLinks.isActive, true), orderBy: [asc(serviceLinks.sortOrder)] } }
  });

  return NextResponse.json(categories);
}

// POST - create category or link
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["admin", "superadmin"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.type === "category") {
    const { name, icon, categoryType, color } = body;
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const [cat] = await db.insert(serviceCategories).values({
      adminId: session.userId,
      name: name.trim(),
      icon: icon || "🔗",
      type: categoryType || "general",
      color: color || "#00f3ff",
    }).returning();

    return NextResponse.json(cat, { status: 201 });
  }

  if (body.type === "link") {
    const { categoryId, name, url, description } = body;
    if (!categoryId || !name || !url) return NextResponse.json({ error: "categoryId, name and url required" }, { status: 400 });

    const [link] = await db.insert(serviceLinks).values({
      categoryId: Number(categoryId),
      adminId: session.userId,
      name: name.trim(),
      url: url.trim(),
      description: description || null,
    }).returning();

    return NextResponse.json(link, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

// DELETE category or link
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !["admin", "superadmin"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, type } = await req.json();

  if (type === "category") {
    await db.delete(serviceCategories).where(eq(serviceCategories.id, Number(id)));
  } else {
    await db.delete(serviceLinks).where(eq(serviceLinks.id, Number(id)));
  }

  return NextResponse.json({ success: true });
}

// PUT - edit category or link
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || !["admin", "superadmin"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.type === "category") {
    const { id, name, icon, categoryType, color } = body;
    if (!id || !name) return NextResponse.json({ error: "ID and Name required" }, { status: 400 });

    const [cat] = await db.update(serviceCategories)
      .set({
        name: name.trim(),
        icon: icon || "🔗",
        type: categoryType || "general",
        color: color || "#00f3ff",
      })
      .where(eq(serviceCategories.id, Number(id)))
      .returning();

    return NextResponse.json(cat);
  }

  if (body.type === "link") {
    const { id, name, url, description } = body;
    if (!id || !name || !url) return NextResponse.json({ error: "id, name and url required" }, { status: 400 });

    const [link] = await db.update(serviceLinks)
      .set({
        name: name.trim(),
        url: url.trim(),
        description: description || null,
      })
      .where(eq(serviceLinks.id, Number(id)))
      .returning();

    return NextResponse.json(link);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
