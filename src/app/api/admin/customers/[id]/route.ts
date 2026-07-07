import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, packages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { syncCustomerToMikrotik, syncDeleteCustomerFromMikrotik } from "@/lib/sync";

// PATCH /api/admin/customers/[id] — update customer
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const customerId = Number(id);
  if (!customerId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const oldCustomer = await db.query.users.findFirst({ where: eq(users.id, customerId) });
    if (!oldCustomer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    // Security: reseller can only edit their own customers
    if (session.role === "reseller" && oldCustomer.resellerId !== session.userId) {
      return NextResponse.json({ error: "Forbidden: Not your customer" }, { status: 403 });
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.name) updateData.name = body.name.trim();
    if (body.phone) {
      const p = body.phone.trim();
      if (p !== oldCustomer.phone) {
        const existingPhone = await db.query.users.findFirst({ where: eq(users.phone, p) });
        if (existingPhone && existingPhone.id !== customerId) {
          return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
        }
      }
      updateData.phone = p;
    }
    if (body.address !== undefined) updateData.address = body.address?.trim() || null;
    if (body.pppoeUsername !== undefined) {
      const ppp = body.pppoeUsername?.trim() || null;
      if (ppp && ppp !== oldCustomer.pppoeUsername) {
        const existingPPPoE = await db.query.users.findFirst({ where: eq(users.pppoeUsername, ppp) });
        if (existingPPPoE && existingPPPoE.id !== customerId) {
          return NextResponse.json({ error: "PPPoE Username already exists. Please use a unique ID." }, { status: 409 });
        }
      }
      updateData.pppoeUsername = ppp;
    }
    if (body.macAddress !== undefined) updateData.macAddress = body.macAddress?.trim() || null;
    if (body.ipAddress !== undefined) updateData.ipAddress = body.ipAddress?.trim() || null;
    if (body.photoUrl !== undefined) updateData.photoUrl = body.photoUrl || null;
    if (body.nidUrl !== undefined) updateData.nidUrl = body.nidUrl || null;
    if (body.nidNumber !== undefined) updateData.nidNumber = body.nidNumber?.trim() || null;
    const parseLocalTime = (dateStr: any) => {
      if (!dateStr) return null;
      let d = String(dateStr);
      if (!d.includes('Z') && !d.includes('+')) d += '+06:00';
      return new Date(d);
    };

    if (body.createdAt !== undefined) updateData.createdAt = parseLocalTime(body.createdAt);
    if (body.expireDate !== undefined) updateData.expireDate = parseLocalTime(body.expireDate);
    if (body.dob !== undefined) updateData.dob = parseLocalTime(body.dob);
    if (body.status) updateData.status = body.status;
    if (body.approvalStatus) updateData.approvalStatus = body.approvalStatus;
    if (body.mikrotikId !== undefined) updateData.mikrotikId = body.mikrotikId ? Number(body.mikrotikId) : null;
    if (body.areaId !== undefined) updateData.areaId = body.areaId ? Number(body.areaId) : null;
    if (body.customerType !== undefined) updateData.customerType = body.customerType || "pppoe";
    if (body.connectionFee !== undefined) updateData.connectionFee = body.connectionFee ? String(body.connectionFee) : "0";
    if (body.promiseDate !== undefined) updateData.promiseDate = parseLocalTime(body.promiseDate);
    if (body.note !== undefined) updateData.note = body.note || null;
    if (body.balance !== undefined) updateData.balance = body.balance ? String(body.balance) : "0";
    if (body.autoRenew !== undefined) updateData.autoRenew = Boolean(body.autoRenew);
    if (body.oltId !== undefined) updateData.oltId = body.oltId ? Number(body.oltId) : null;
    if (body.tjBoxId !== undefined) updateData.tjBoxId = body.tjBoxId ? Number(body.tjBoxId) : null;
    if (body.ponPort !== undefined) updateData.ponPort = body.ponPort?.trim() || null;
    if (body.onuMac !== undefined) updateData.onuMac = body.onuMac?.trim() || null;
    if (body.routerModel !== undefined) updateData.routerModel = body.routerModel?.trim() || null;
    if (body.routerUsername !== undefined) updateData.routerUsername = body.routerUsername?.trim() || null;
    if (body.routerPassword !== undefined) updateData.routerPassword = body.routerPassword?.trim() || null;
    if (body.alternatePhone !== undefined) updateData.alternatePhone = body.alternatePhone?.trim() || null;
    if (body.division !== undefined) updateData.division = body.division?.trim() || null;
    if (body.district !== undefined) updateData.district = body.district || null;
    if (body.thana !== undefined) updateData.thana = body.thana || null;
    if (body.discount !== undefined) updateData.discount = body.discount ? String(body.discount) : "0";
    if (body.billingPosition !== undefined) updateData.billingPosition = body.billingPosition || "active_billable";
    if (body.billingCycleDay !== undefined) updateData.billingCycleDay = body.billingCycleDay || "standard_30";
    if (body.connectionType !== undefined) updateData.connectionType = body.connectionType || "fiber";
    if (body.gpsCoordinates !== undefined) updateData.gpsCoordinates = body.gpsCoordinates?.trim() || null;
    if (body.joiningDate !== undefined) updateData.joiningDate = body.joiningDate ? new Date(body.joiningDate) : null;

    // Package change
    if (body.packageId !== undefined) {
      updateData.packageId = body.packageId ? Number(body.packageId) : null;
    }

    // Password change
    if (body.password && body.password.length >= 6) {
      updateData.password = await bcrypt.hash(body.password, 12);
      updateData.plainPassword = body.password;
    }

    const [updated] = await db.update(users).set(updateData).where(eq(users.id, customerId)).returning();

    // Automatically sync changes to MikroTik router
    if (updated) {
      const oldUsername = oldCustomer.pppoeUsername;
      const newUsername = updated.pppoeUsername;

      if (oldUsername && oldUsername !== newUsername) {
        // Username changed or removed. Delete the old secret.
        await syncDeleteCustomerFromMikrotik(oldUsername, oldCustomer.mikrotikId, [customerId]);
      }

      const isNowExpired = updated.expireDate && new Date(updated.expireDate) <= new Date();
      const effectiveStatus = isNowExpired ? "expired" : updated.status;
      const needsMikrotikSync = 
        (body.password !== undefined && body.password.length >= 6) ||
        (updated.packageId !== oldCustomer.packageId) ||
        (updated.status !== oldCustomer.status) ||
        (isNowExpired && oldCustomer.status === "active") || 
        (oldUsername !== newUsername);

      if (needsMikrotikSync) {
        if (newUsername) {
          // Sync the PPPoE secret
          await syncCustomerToMikrotik(
            newUsername,
            body.password || undefined,
            updated.packageId,
            effectiveStatus,
            updated.mikrotikId
          );
        } else if (updated.customerType === "static" && updated.ipAddress) {
          // Sync Static IP
          const { suspendUsers, unsuspendStaticUsers } = await import("@/lib/mikrotik");
          if (effectiveStatus !== "active" && effectiveStatus !== "online") {
            await suspendUsers([{ ipAddress: updated.ipAddress, type: "static" }], updated.mikrotikId);
          } else {
            await unsuspendStaticUsers([{ ipAddress: updated.ipAddress }], updated.mikrotikId);
          }
        }
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Update customer error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/admin/customers/[id] — delete customer
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const customerId = Number(id);
  if (!customerId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const customer = await db.query.users.findFirst({ where: eq(users.id, customerId) });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Security: reseller can only delete their own customers
  if (session.role === "reseller" && customer.resellerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden: Not your customer" }, { status: 403 });
  }

  if (customer.pppoeUsername) {
    // Delete secret from MikroTik
    await syncDeleteCustomerFromMikrotik(customer.pppoeUsername, customer.mikrotikId, [customerId]);
  }

  await db.delete(users).where(eq(users.id, customerId));
  return NextResponse.json({ success: true });
}

// GET /api/admin/customers/[id] — get single customer
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const customer = await db.query.users.findFirst({
    where: eq(users.id, Number(id)),
    with: { package: true, mikrotik: true, payments: true, invoices: true, olt: true },
  });

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Security: reseller can only view their own customers
  if (session.role === "reseller" && customer.resellerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden: Not your customer" }, { status: 403 });
  }

  return NextResponse.json(customer);
}
