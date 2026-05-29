import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "reseller") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reseller = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: {
        id: true,
        name: true,
        phone: true,
        walletBalance: true,
        role: true,
      },
    });

    if (!reseller) {
      return NextResponse.json({ error: "Reseller not found" }, { status: 404 });
    }

    return NextResponse.json(reseller);
  } catch (err) {
    console.error("Fetch reseller profile error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
