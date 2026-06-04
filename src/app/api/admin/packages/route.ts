import { NextResponse } from "next/server";
import { db } from "@/db";
import { packages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let adminId = session.userId;
  if (session.role === "reseller" || session.role === "employee") {
    const u = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { adminId: true }
    });
    adminId = u?.adminId || 1;
  }

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

  const [pkg] = await db.insert(packages).values({
    name: name.trim(),
    speed: speed.trim(),
    price: String(price),
    durationDays: Number(durationDays) || 30,
    adminId: session.userId,
  }).returning();

  return NextResponse.json(pkg, { status: 201 });
}
