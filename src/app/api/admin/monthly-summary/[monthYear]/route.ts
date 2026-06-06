import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, expenses, invoices, users } from "@/db/schema";
import { sql, and, eq, inArray } from "drizzle-orm";
import { getSession, getAdminIdForSession } from "@/lib/auth";
import { insertAuditLog } from "@/lib/audit";

// DELETE /api/admin/monthly-summary/[monthYear] - Deletes all records for a specific month
export async function DELETE(req: Request, { params }: { params: Promise<{ monthYear: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const monthYear = resolvedParams.monthYear; // e.g. "2026-05"

    if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
      return NextResponse.json({ error: "Invalid month format. Expected YYYY-MM." }, { status: 400 });
    }

    const adminId = await getAdminIdForSession(session);

    // Get all user IDs belonging to this admin
    const adminUserRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.adminId, adminId));
    const adminUserIds = adminUserRows.map(u => u.id);

    if (adminUserIds.length > 0) {
      // Delete Payments
      await db.delete(payments)
        .where(and(
          inArray(payments.userId, adminUserIds),
          sql`to_char(${payments.createdAt}, 'YYYY-MM') = ${monthYear}`
        ));

      // Delete Invoices
      await db.delete(invoices)
        .where(and(
          inArray(invoices.userId, adminUserIds),
          sql`to_char(${invoices.createdAt}, 'YYYY-MM') = ${monthYear}`
        ));
    }

    // Delete Expenses
    await db.delete(expenses)
      .where(and(
        eq(expenses.adminId, adminId),
        sql`to_char(${expenses.createdAt}, 'YYYY-MM') = ${monthYear}`
      ));

    await insertAuditLog(
      session.userId,
      "DELETE_MONTHLY_SUMMARY",
      `Admin deleted all payments, invoices, and expenses for month: ${monthYear}`
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete monthly summary error:", err);
    return NextResponse.json({ error: "Failed to delete records" }, { status: 500 });
  }
}
