import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, expenses, invoices } from "@/db/schema";
import { sql, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { insertAuditLog } from "@/lib/audit";

// DELETE /api/admin/monthly-summary/[monthYear] - Deletes all records for a specific month
export async function DELETE(req: Request, { params }: { params: Promise<{ monthYear: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const monthYear = resolvedParams.monthYear; // e.g. "2026-05"

    if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
      return NextResponse.json({ error: "Invalid month format. Expected YYYY-MM." }, { status: 400 });
    }

    // Delete Payments
    await db.delete(payments)
      .where(sql`to_char(${payments.createdAt}, 'YYYY-MM') = ${monthYear}`);

    // Delete Expenses
    await db.delete(expenses)
      .where(sql`to_char(${expenses.createdAt}, 'YYYY-MM') = ${monthYear}`);

    // Delete Invoices
    await db.delete(invoices)
      .where(sql`to_char(${invoices.createdAt}, 'YYYY-MM') = ${monthYear}`);

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
