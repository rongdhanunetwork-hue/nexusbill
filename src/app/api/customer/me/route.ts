import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customer = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: {
        id: true,
        name: true,
        photoUrl: true,
      }
    });

    return NextResponse.json(customer);
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
