import { db } from "@/db";
import { payments, expenses, users, invoices } from "@/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import MonthlyDetailsClient from "./MonthlyDetailsClient";

export const dynamic = "force-dynamic";

export default async function MonthlyDetailsPage({ params }: { params: Promise<{ monthYear: string }> }) {
  const resolvedParams = await params;
  const monthYear = resolvedParams.monthYear; // e.g., "2026-05"

  if (!/^\d{4}-\d{2}$/.test(monthYear)) {
    return <div>Invalid month format</div>;
  }

  // 1. Fetch Recharges (Payments)
  const monthPayments = await db.query.payments.findMany({
    where: and(
      eq(payments.status, "approved"),
      sql`to_char(${payments.createdAt}, 'YYYY-MM') = ${monthYear}`
    ),
    with: { user: true },
    orderBy: [desc(payments.createdAt)],
  });

  // 2. Fetch Expenses
  const monthExpenses = await db.query.expenses.findMany({
    where: sql`to_char(${expenses.createdAt}, 'YYYY-MM') = ${monthYear}`,
    orderBy: [desc(expenses.createdAt)],
  });

  // 3. Fetch New Customers
  const newCustomers = await db.query.users.findMany({
    where: and(
      eq(users.role, "customer"),
      sql`to_char(${users.createdAt}, 'YYYY-MM') = ${monthYear}`
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
