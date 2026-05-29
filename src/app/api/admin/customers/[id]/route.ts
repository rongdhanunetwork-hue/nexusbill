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
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const customerId = Number(id);
  if (!customerId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.name) updateData.name = body.name.trim();
    if (body.phone) updateData.phone = body.phone.trim();
    if (body.address !== undefined) updateData.address = body.address?.trim() || null;
    if (body.pppoeUsername !== undefined) updateData.pppoeUsername = body.pppoeUsername?.trim() || null;
    if (body.macAddress !== undefined) updateData.macAddress = body.macAddress?.trim() || null;
    if (body.photoUrl !== undefined) updateData.photoUrl = body.photoUrl || null;
    if (body.nidUrl !== undefined) updateData.nidUrl = body.nidUrl || null;
    if (body.nidNumber !== undefined) updateData.nidNumber = body.nidNumber?.trim() || null;
    if (body.createdAt !== undefined) updateData.createdAt = body.createdAt ? new Date(body.createdAt) : null;
    if (body.expireDate !== undefined) updateData.expireDate = body.expireDate ? new Date(body.expireDate) : null;
    if (body.dob !== undefined) updateData.dob = body.dob ? new Date(body.dob) : null;
    if (body.status) updateData.status = body.status;
    if (body.approvalStatus) updateData.approvalStatus = body.approvalStatus;
    if (body.mikrotikId !== undefined) updateData.mikrotikId = body.mikrotikId ? Number(body.mikrotikId) : null;

    // Package change — recompute expire date
    if (body.packageId !== undefined) {
      updateData.packageId = body.packageId ? Number(body.packageId) : null;
      if (body.packageId) {
        const pkg = await db.query.packages.findFirst({ where: eq(packages.id, Number(body.packageId)) });
        if (pkg) {
          updateData.expireDate = new Date(Date.now() + (pkg.durationDays || 30) * 24 * 60 * 60 * 1000);
        }
      }
    }

    // Password change
    if (body.password && body.password.length >= 6) {
      updateData.password = await bcrypt.hash(body.password, 12);
    }

    const oldCustomer = await db.query.users.findFirst({ where: eq(users.id, customerId) });
    if (!oldCustomer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const [updated] = await db.update(users).set(updateData).where(eq(users.id, customerId)).returning();

    // Automatically sync changes to MikroTik router
    if (updated) {
      const oldUsername = oldCustomer.pppoeUsername;
      const newUsername = updated.pppoeUsername;

      if (oldUsername && oldUsername !== newUsername) {
        // Username changed or removed. Delete the old secret.
        await syncDeleteCustomerFromMikrotik(oldUsername);
      }

      if (newUsername) {
        // Sync the new/updated secret
        await syncCustomerToMikrotik(
          newUsername,
          body.password || undefined,
          updated.packageId,
          updated.status
        );
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
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const customerId = Number(id);
  if (!customerId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  // Fetch customer to get pppoeUsername before deleting
  const customer = await db.query.users.findFirst({ where: eq(users.id, customerId) });
  if (customer && customer.pppoeUsername) {
    // Delete secret from MikroTik
    await syncDeleteCustomerFromMikrotik(customer.pppoeUsername);
  }

  await db.delete(users).where(eq(users.id, customerId));
  return NextResponse.json({ success: true });
}

// GET /api/admin/customers/[id] — get single customer
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const customer = await db.query.users.findFirst({
    where: eq(users.id, Number(id)),
    with: { package: true, mikrotik: true, payments: true, invoices: true },
  });

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(customer);
}
