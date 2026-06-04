import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

async function checkSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== "superadmin") return null;
  return session;
}

// GET: list all admins
export async function GET(req: Request) {
  const session = await checkSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const idStr = searchParams.get("id");
  if (idStr) {
    const id = Number(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    const admin = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { id: true, name: true, phone: true, address: true, role: true, status: true, createdAt: true },
    });
    if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(admin);
  }

  const admins = await db.query.users.findMany({
    where: eq(users.role, "admin"),
    orderBy: [desc(users.createdAt)],
    columns: { id: true, name: true, phone: true, address: true, status: true, createdAt: true },
  });

  return NextResponse.json(admins);
}

// POST: create new admin
export async function POST(req: Request) {
  const session = await checkSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, phone, password, address } = await req.json();
  if (!name || !phone || !password || password.length < 6) {
    return NextResponse.json({ error: "Invalid data. Password must be at least 6 characters." }, { status: 400 });
  }

  const existing = await db.query.users.findFirst({ where: eq(users.phone, phone.trim()) });
  if (existing) return NextResponse.json({ error: "Phone number already registered." }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const [newAdmin] = await db.insert(users).values({
    name: name.trim(),
    phone: phone.trim(),
    password: hashed,
    role: "admin",
    address: address?.trim() || null,
    approvalStatus: "approved",
    status: "active",
    walletBalance: "0",
  }).returning({ id: users.id, name: users.name });

  return NextResponse.json({ success: true, admin: newAdmin });
}

// PATCH: update admin status
export async function PATCH(req: Request) {
  const session = await checkSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status, name, phone, address, newPassword } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing admin ID" }, { status: 400 });

  const updateData: Record<string, any> = {};
  if (status) updateData.status = status;
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (address !== undefined) updateData.address = address;
  if (newPassword && newPassword.length >= 6) {
    updateData.password = await bcrypt.hash(newPassword, 12);
  }

  await db.update(users).set(updateData).where(eq(users.id, id));
  return NextResponse.json({ success: true });
}

// DELETE: delete admin
export async function DELETE(req: Request) {
  const session = await checkSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  // Safety: can't delete self
  if (id === session.userId) return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });

  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ success: true });
}
