import { NextResponse } from "next/server";
import { db } from "@/db";
import { notices } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "reseller") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notifications: any[] = [];
    
    // Add logic here later for reseller-specific notifications if needed
    // Example: tickets answered, low wallet balance, etc.

    return NextResponse.json(notifications);
  } catch (err) {
    console.error("Reseller notifications error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
