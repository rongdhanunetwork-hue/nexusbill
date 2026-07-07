import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createNotificationForAdmins } from "@/lib/notifications";
export async function POST(req: Request) {
  try {
    const { name, phone, password, address, photoUrl, nidUrl } = await req.json();

    if (!name || !phone || !password) {
      return NextResponse.json({ error: "Name, phone and password required" }, { status: 400 });
    }

    // Check if phone already exists
    const existing = await db.query.users.findFirst({ where: eq(users.phone, phone.trim()) });
    if (existing) {
      return NextResponse.json({ error: "Phone number already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [newUser] = await db.insert(users).values({
      name: name.trim(),
      phone: phone.trim(),
      password: hashedPassword,
      address: address?.trim() || null,
      photoUrl: photoUrl?.trim() || null,
      nidUrl: nidUrl?.trim() || null,
      role: "customer",
      approvalStatus: "pending",
      status: "offline",
    }).returning({ id: users.id, name: users.name, phone: users.phone });

    await createNotificationForAdmins(
      "New Registration Pending",
      `${name.trim()} (${phone.trim()}) registered and is awaiting approval.`,
      "/admin/customers?status=pending_approval"
    );

    return NextResponse.json({
      success: true,
      message: "Registration submitted. Awaiting admin approval.",
      user: newUser,
    }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
