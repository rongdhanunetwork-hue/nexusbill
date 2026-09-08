import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminRentalRequests, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await db
      .select({
        id: adminRentalRequests.id,
        adminId: adminRentalRequests.adminId,
        adminName: users.name,
        adminPhone: users.phone,
        amount: adminRentalRequests.amount,
        paymentMethod: adminRentalRequests.paymentMethod,
        trxId: adminRentalRequests.trxId,
        note: adminRentalRequests.note,
        status: adminRentalRequests.status,
        requestedDays: adminRentalRequests.requestedDays,
        createdAt: adminRentalRequests.createdAt,
        approvedAt: adminRentalRequests.approvedAt,
      })
      .from(adminRentalRequests)
      .innerJoin(users, eq(adminRentalRequests.adminId, users.id))
      .orderBy(desc(adminRentalRequests.createdAt));

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Fetch rental requests error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
