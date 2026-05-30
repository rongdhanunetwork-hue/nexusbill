import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, packages } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { syncCustomerToMikrotik } from "@/lib/sync";
import { insertAuditLog } from "@/lib/audit";

// GET /api/admin/customers — list customers (filtered by role)
export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let customers;
  if (session.role === "reseller") {
    customers = await db.query.users.findMany({
      where: and(eq(users.role, "customer"), eq(users.resellerId, session.userId)),
      orderBy: [asc(users.name)],
      with: { package: true },
    });
  } else {
    customers = await db.query.users.findMany({
      where: eq(users.role, "customer"),
      orderBy: [asc(users.name)],
      with: { package: true },
    });
  }

  return NextResponse.json(customers);
}

// POST /api/admin/customers — create customer
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name, phone, password, address,
      pppoeUsername, packageId, mikrotikId,
      photoUrl, nidUrl, macAddress, ipAddress,
      nidNumber, createdAt, expireDate, dob, resellerId,
      areaId, customerType, connectionFee, promiseDate, note
    } = body;

    if (!name || !phone || !password) {
      return NextResponse.json({ error: "Name, phone, password required" }, { status: 400 });
    }

    const existing = await db.query.users.findFirst({ where: eq(users.phone, phone.trim()) });
    if (existing) {
      return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Compute expiry: newly created customers are expired by default unless a custom future date is supplied
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
      ipAddress: ipAddress?.trim() || null,
      resellerId: session.role === "reseller" ? session.userId : (resellerId ? Number(resellerId) : null),
      role: "customer",
      approvalStatus: "approved",
      status: "expired",
      expireDate: calculatedExpireDate,
      dob: dob ? new Date(dob) : null,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      areaId: areaId ? Number(areaId) : null,
      customerType: customerType || "pppoe",
      connectionFee: connectionFee ? String(connectionFee) : "0",
      promiseDate: promiseDate ? new Date(promiseDate) : null,
      note: note || null,
    }).returning();

    // Automatically sync customer PPPoE secret to MikroTik router (disabled by default)
    if (pppoeUsername?.trim()) {
      await syncCustomerToMikrotik(pppoeUsername.trim(), password, packageId, "expired");
    }

    await insertAuditLog(session.userId, "CREATE_CUSTOMER", `Created customer ${customer.name} (Phone: ${customer.phone})`);

    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    console.error("Create customer error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
