import { NextResponse } from "next/server";
import { db } from "@/db";
import { packages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { users } from "@/db/schema";
import { getSession, getAdminIdForSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = await getAdminIdForSession(session);

  const pkgs = await db.query.packages.findMany({
    where: eq(packages.adminId, adminId),
    orderBy: [desc(packages.createdAt)]
  });
  return NextResponse.json(pkgs);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, speed, price, durationDays } = body;

  if (!name || !speed || !price) {
    return NextResponse.json({ error: "Name, speed, price required" }, { status: 400 });
  }

  const adminId = await getAdminIdForSession(session);

  const [pkg] = await db.insert(packages).values({
    name: name.trim(),
    speed: speed.trim(),
    price: String(price),
    durationDays: Number(durationDays) || 30,
    adminId,
  }).returning();

  return NextResponse.json(pkg, { status: 201 });
}
