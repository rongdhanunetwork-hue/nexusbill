import { db } from "@/db";
import { payments, users, invoices, transactions } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import ReportsClient from "@/app/admin/reports/ReportsClient";

export const dynamic = "force-dynamic";

export default async function EmployeeReportsPage() {
  const approvedPayments = await db.query.payments.findMany({
    where: eq(payments.status, "approved"),
    orderBy: [desc(payments.createdAt)],
    with: {
      user: true,
    },
  });

  const dueInvoices = await db.query.invoices.findMany({
    where: sql`${invoices.status} in ('unpaid', 'due')`,
    orderBy: [desc(invoices.createdAt)],
    with: {
      user: true,
    },
  });

  const customers = await db.query.users.findMany({
    where: eq(users.role, "customer"),
    orderBy: [desc(users.createdAt)],
  });

  const allTransactions = await db.query.transactions.findMany({
    orderBy: [desc(transactions.createdAt)],
    with: {
      reseller: true,
      customer: true
    }
  });

  return (
    <ReportsClient
      approvedPayments={approvedPayments}
      dueInvoices={dueInvoices}
      customers={customers}
      allTransactions={allTransactions}
      role="employee"
    />
  );
}
