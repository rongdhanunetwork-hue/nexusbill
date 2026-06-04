import { db } from "@/db";
import { payments, expenses, users, invoices } from "@/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import MonthlyDetailsClient from "./MonthlyDetailsClient";

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MonthlyDetailsPage({ params }: { params: Promise<{ monthYear: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    redirect("/login");
  }
  const adminId = session.userId;

  const resolvedParams = await params;
  const monthYear = resolvedParams.monthYear; // e.g., "2026-05"

  if (!/^\d{4}-\d{2}$/.test(monthYear)) {
    return <div>Invalid month format</div>;
  }

  // 1. Fetch Recharges (Payments) - Join to users to filter by adminId
  const rawPayments = await db
    .select({
      payment: payments,
      user: users
    })
    .from(payments)
    .innerJoin(users, eq(payments.userId, users.id))
    .where(and(
      eq(payments.status, "approved"),
      sql`to_char(${payments.createdAt}, 'YYYY-MM') = ${monthYear}`,
      eq(users.adminId, adminId)
    ))
    .orderBy(desc(payments.createdAt));

  const monthPayments = rawPayments.map(r => ({
    ...r.payment,
    user: r.user
  }));

  // 2. Fetch Expenses
  const monthExpenses = await db.query.expenses.findMany({
    where: and(
      sql`to_char(${expenses.createdAt}, 'YYYY-MM') = ${monthYear}`,
      eq(expenses.adminId, adminId)
    ),
    orderBy: [desc(expenses.createdAt)],
  });

  // 3. Fetch New Customers
  const newCustomers = await db.query.users.findMany({
    where: and(
      eq(users.role, "customer"),
      sql`to_char(${users.createdAt}, 'YYYY-MM') = ${monthYear}`,
      eq(users.adminId, adminId)
    ),
    with: { package: true },
    orderBy: [desc(users.createdAt)],
  });

  return (
    <MonthlyDetailsClient
      monthYear={monthYear}
      payments={monthPayments}
      expenses={monthExpenses}
      newCustomers={newCustomers}
    />
  );
}
