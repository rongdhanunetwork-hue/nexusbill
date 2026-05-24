import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, packages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET /api/admin/customers — list all customers
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customers = await db.query.users.findMany({
    where: eq(users.role, "customer"),
    orderBy: [desc(users.createdAt)],
    with: { package: true },
  });

  return NextResponse.json(customers);
}

// POST /api/admin/customers — create customer
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name, phone, password, address,
      pppoeUsername, packageId, mikrotikId,
      photoUrl, nidUrl, macAddress,
    } = body;

    if (!name || !phone || !password) {
      return NextResponse.json({ error: "Name, phone, password required" }, { status: 400 });
    }

    const existing = await db.query.users.findFirst({ where: eq(users.phone, phone.trim()) });
    if (existing) {
      return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Compute expiry: find package duration
    let expireDate: Date | null = null;
    if (packageId) {
      const pkg = await db.query.packages.findFirst({ where: eq(packages.id, Number(packageId)) });
      if (pkg) {
        expireDate = new Date(Date.now() + (pkg.durationDays || 30) * 24 * 60 * 60 * 1000);
      }
    }

    const [customer] = await db.insert(users).values({
      name: name.trim(),
      phone: phone.trim(),
      password: hashedPassword,
      address: address?.trim() || null,
      pppoeUsername: pppoeUsername?.trim() || null,
      packageId: packageId ? Number(packageId) : null,
      mikrotikId: mikrotikId ? Number(mikrotikId) : null,
      photoUrl: photoUrl || null,
      nidUrl: nidUrl || null,
      macAddress: macAddress?.trim() || null,
      role: "customer",
      approvalStatus: "approved",
      status: "active",
      expireDate,
    }).returning();

    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    console.error("Create customer error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
