import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, adminRentalRequests, systemNotifications } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, paymentMethod = "cash", trxId = "", note = "", days = 30 } = body;

    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    const rentalFee = amount || adminUser.monthlyRentalFee || 500;

    const [newRequest] = await db.insert(adminRentalRequests).values({
      adminId: adminUser.id,
      amount: rentalFee.toString(),
      paymentMethod,
      trxId: trxId ? trxId.trim() : null,
      note: note ? note.trim() : null,
      status: "pending",
      requestedDays: parseInt(days, 10) || 30,
    }).returning();

    // Create Notification for Super Admin
    try {
      const superAdmins = await db.query.users.findMany({
        where: eq(users.role, "superadmin"),
      });

      for (const sa of superAdmins) {
        await db.insert(systemNotifications).values({
          userId: sa.id,
          title: "Manual Rental Payment Request",
          message: `Admin ${adminUser.name} submitted a ${paymentMethod.toUpperCase()} payment request of BDT ${rentalFee} for software renewal.`,
          link: "/superadmin/admins",
        });
      }
    } catch (e) {
      console.error("Failed to notify superadmin:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Payment request submitted to Super Admin for approval.",
      request: newRequest,
    });
  } catch (error) {
    console.error("Manual rental request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
