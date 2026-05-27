import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, packages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { syncCustomerToMikrotik } from "@/lib/sync";

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
      nidNumber, createdAt, expireDate, dob
    } = body;

    if (!name || !phone || !password) {
      return NextResponse.json({ error: "Name, phone, password required" }, { status: 400 });
    }

    const existing = await db.query.users.findFirst({ where: eq(users.phone, phone.trim()) });
    if (existing) {
      return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Compute expiry: only set if custom expireDate is explicitly provided in the creation form
    let calculatedExpireDate: Date | null = null;
    if (expireDate) {
      calculatedExpireDate = new Date(expireDate);
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
      nidNumber: nidNumber?.trim() || null,
      macAddress: macAddress?.trim() || null,
      role: "customer",
      approvalStatus: "approved",
      status: "active",
      expireDate: calculatedExpireDate,
      dob: dob ? new Date(dob) : null,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
    }).returning();

    // Automatically sync customer PPPoE secret to MikroTik router
    if (pppoeUsername?.trim()) {
      await syncCustomerToMikrotik(pppoeUsername.trim(), password, packageId, "active");
    }

    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    console.error("Create customer error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
