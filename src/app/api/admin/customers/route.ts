import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, packages, dataUsage, payments, invoices, transactions, tickets } from "@/db/schema";
import { eq, asc, and, isNull, inArray, sql } from "drizzle-orm";
import { getSession, getAdminIdForSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { syncCustomerToMikrotik, syncDeleteCustomerFromMikrotik } from "@/lib/sync";
import { insertAuditLog } from "@/lib/audit";

// GET /api/admin/customers — list customers (filtered by role)
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = await getAdminIdForSession(session);

  // Support optional pagination via ?page={n}&pageSize={m}
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "0") || 0;
  const pageSize = parseInt(url.searchParams.get("pageSize") || "0") || 0;

  const baseWhere = session.role === "reseller"
    ? and(eq(users.role, "customer"), eq(users.resellerId, session.userId), eq(users.adminId, adminId))
    : and(eq(users.role, "customer"), eq(users.adminId, adminId), isNull(users.resellerId));

  if (page > 0 && pageSize > 0) {
    const [{ count: total }] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(users).where(baseWhere);
    const items = await db.query.users.findMany({
      where: baseWhere,
      orderBy: [asc(users.name)],
      with: { package: true },
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return NextResponse.json({ items, total });
  }

  const customers = await db.query.users.findMany({
    where: baseWhere,
    orderBy: [asc(users.name)],
    with: { package: true },
  });

  return NextResponse.json(customers);
}

// POST /api/admin/customers — create customer
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = await getAdminIdForSession(session);

  try {
    const body = await req.json();
    const {
      name, phone, password, address,
      pppoeUsername, packageId, mikrotikId,
      photoUrl, nidUrl, macAddress, ipAddress,
      nidNumber, createdAt, expireDate, dob, resellerId,
      areaId, customerType, connectionFee, promiseDate, note, autoRenew,
      oltId, tjBoxId, ponPort, onuMac, routerModel, routerUsername, routerPassword,
      alternatePhone, division, district, thana, discount, billingPosition, billingCycleDay,
      connectionType, gpsCoordinates, joiningDate, status
    } = body;

    if (!name || !phone || !password) {
      return NextResponse.json({ error: "Name, phone, password required" }, { status: 400 });
    }

    const existingPhone = await db.query.users.findFirst({ where: eq(users.phone, phone.trim()) });
    if (existingPhone) {
      return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    }

    if (pppoeUsername?.trim()) {
      const existingPPPoE = await db.query.users.findFirst({ where: eq(users.pppoeUsername, pppoeUsername.trim()) });
      if (existingPPPoE) {
        return NextResponse.json({ error: "PPPoE Username already exists. Please use a unique ID." }, { status: 409 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Compute expiry: newly created customers are expired by default unless a custom future date is supplied
    let calculatedExpireDate: Date | null = null;
    if (expireDate) {
      calculatedExpireDate = new Date(expireDate + (expireDate.includes('Z') ? '' : 'Z'));
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
      status: status || "expired",
      expireDate: calculatedExpireDate,
      dob: dob ? new Date(dob + (dob.includes('Z') ? '' : 'Z')) : null,
      createdAt: createdAt ? new Date(createdAt + (createdAt.includes('Z') ? '' : 'Z')) : new Date(),
      areaId: areaId ? Number(areaId) : null,
      customerType: customerType || "pppoe",
      connectionFee: connectionFee ? String(connectionFee) : "0",
      promiseDate: promiseDate ? new Date(promiseDate + (promiseDate.includes('Z') ? '' : 'Z')) : null,
      note: note || null,
      autoRenew: autoRenew !== undefined ? Boolean(autoRenew) : false,
      oltId: oltId ? Number(oltId) : null,
      tjBoxId: tjBoxId ? Number(tjBoxId) : null,
      ponPort: ponPort?.trim() || null,
      onuMac: onuMac?.trim() || null,
      routerModel: routerModel?.trim() || null,
      routerUsername: routerUsername?.trim() || null,
      routerPassword: routerPassword?.trim() || null,
      adminId,
      alternatePhone: alternatePhone?.trim() || null,
      division: division?.trim() || null,
      district: district?.trim() || null,
      thana: thana?.trim() || null,
      discount: discount ? String(discount) : "0",
      billingPosition: billingPosition || "active_billable",
      billingCycleDay: billingCycleDay || "standard_30",
      connectionType: connectionType || "fiber",
      gpsCoordinates: gpsCoordinates?.trim() || null,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
    }).returning();

    // Automatically sync customer PPPoE secret to MikroTik router (disabled by default)
    if (pppoeUsername?.trim()) {
      await syncCustomerToMikrotik(pppoeUsername.trim(), password, packageId, "expired", mikrotikId ? Number(mikrotikId) : null);
    }

    await insertAuditLog(session.userId, "CREATE_CUSTOMER", `Created customer ${customer.name} (Phone: ${customer.phone})`);

    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    console.error("Create customer error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/admin/customers — bulk delete customers
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = await getAdminIdForSession(session);

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No customer IDs provided" }, { status: 400 });
    }

    // Filter IDs to ensure they belong to this admin/reseller
    const targetCustomers = await db.select()
      .from(users)
      .where(
        and(
          eq(users.role, "customer"),
          inArray(users.id, ids),
          session.role === "reseller"
            ? and(eq(users.resellerId, session.userId), eq(users.adminId, adminId))
            : and(eq(users.adminId, adminId), isNull(users.resellerId))
        )
      );

    const validIds = targetCustomers.map(c => c.id);

    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid customers found for deletion" }, { status: 404 });
    }

    // Sync deletion of PPPoE secrets on MikroTik
    for (const customer of targetCustomers) {
      if (customer.pppoeUsername) {
        try {
          await syncDeleteCustomerFromMikrotik(customer.pppoeUsername, customer.mikrotikId, validIds);
        } catch (err) {
          console.error(`Failed to delete MikroTik secret for ${customer.pppoeUsername}:`, err);
        }
      }
    }

    // Delete dependent tables to maintain DB integrity
    await db.delete(dataUsage).where(inArray(dataUsage.userId, validIds));
    await db.delete(payments).where(inArray(payments.userId, validIds));
    await db.delete(invoices).where(inArray(invoices.userId, validIds));
    await db.delete(transactions).where(inArray(transactions.customerId, validIds));
    await db.delete(tickets).where(inArray(tickets.userId, validIds));

    // Delete users from users table
    await db.delete(users).where(inArray(users.id, validIds));

    // Log action to audit trails
    await insertAuditLog(
      session.userId,
      "BULK_DELETE_CUSTOMERS",
      `Bulk deleted ${validIds.length} customer(s). IDs: ${validIds.join(", ")}`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${validIds.length} customer(s).`,
    });
  } catch (err) {
    console.error("Bulk delete customers error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
