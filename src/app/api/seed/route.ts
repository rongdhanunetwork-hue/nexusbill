import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, packages, mikrotiks, settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    // Check if we already have admin
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.role, 'admin')
    });

    if (existingAdmin) {
      return NextResponse.json({ message: "Already seeded" });
    }

    // Insert Admin
    await db.insert(users).values({
      role: 'admin',
      name: 'Admin User',
      phone: '01700000000',
      password: 'password123',
      address: 'Admin Office',
    });

    // Insert Package
    const [pkg1] = await db.insert(packages).values({
      name: 'Basic Plan',
      speed: '10 Mbps',
      price: '500.00',
      durationDays: 30
    }).returning();

    const [pkg2] = await db.insert(packages).values({
      name: 'Pro Plan',
      speed: '20 Mbps',
      price: '800.00',
      durationDays: 30
    }).returning();

    // Insert Mikrotik
    const [router] = await db.insert(mikrotiks).values({
      name: 'Main Router',
      ipAddress: '192.168.1.1',
      username: 'admin',
      password: 'router_password',
      status: true
    }).returning();

    // Insert Customer
    await db.insert(users).values({
      role: 'customer',
      name: 'John Doe',
      phone: '01800000000',
      password: 'password123',
      address: '123 Main St',
      pppoeUsername: 'john_doe_pppoe',
      packageId: pkg1.id,
      mikrotikId: router.id,
      status: 'active',
      expireDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });

    // Insert Settings
    await db.insert(settings).values([
      { key: 'bkash_number', value: '017XXXXXXXX' },
      { key: 'nagad_number', value: '018XXXXXXXX' }
    ]);

    return NextResponse.json({ message: "Seed successful" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
