import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allUsers = await db.query.users.findMany({
      where: or(
        eq(users.role, "reseller"),
        eq(users.role, "employee"),
        eq(users.role, "customer")
      ),
      orderBy: [desc(users.createdAt)],
      columns: {
        id: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        walletBalance: true,
      }
    });

    return NextResponse.json(allUsers);
  } catch (err) {
    console.error("Superadmin users fetch error:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
