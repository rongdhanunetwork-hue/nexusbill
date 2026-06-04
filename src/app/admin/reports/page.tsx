import { db } from "@/db";
import { payments, users, invoices, transactions, expenses } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import ReportsClient from "./ReportsClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    redirect("/login");
  }
  const adminId = session.userId;

  const approvedPaymentsRaw = await db
    .select({
      payment: payments,
      user: users
    })
    .from(payments)
    .innerJoin(users, eq(payments.userId, users.id))
    .where(and(eq(payments.status, "approved"), eq(users.adminId, adminId)))
    .orderBy(desc(payments.createdAt));

  const approvedPayments = approvedPaymentsRaw.map(r => ({
    ...r.payment,
    user: r.user
  }));

  const dueInvoicesRaw = await db
    .select({
      invoice: invoices,
      user: users
    })
    .from(invoices)
    .innerJoin(users, eq(invoices.userId, users.id))
    .where(and(sql`${invoices.status} in ('unpaid', 'due')`, eq(users.adminId, adminId)))
    .orderBy(desc(invoices.createdAt));

  const dueInvoices = dueInvoicesRaw.map(r => ({
    ...r.invoice,
    user: r.user
  }));

  const customers = await db.query.users.findMany({
    where: and(eq(users.role, "customer"), eq(users.adminId, adminId)),
    orderBy: [desc(users.createdAt)],
  });

  const rawTransactions = await db.query.transactions.findMany({
    orderBy: [desc(transactions.createdAt)],
    with: { reseller: true, customer: true },
  });

  const allTransactions = rawTransactions.filter(
    t => t.reseller && t.reseller.adminId === adminId
  );

  // Fetch all expenses for expense vs income report
  const allExpenses = await db.query.expenses.findMany({
    where: eq(expenses.adminId, adminId),
    orderBy: [desc(expenses.createdAt)],
  });

  return (
    <ReportsClient
      approvedPayments={approvedPayments}
      dueInvoices={dueInvoices}
      customers={customers}
      allTransactions={allTransactions as any}
      allExpenses={allExpenses}
      role="admin"
    />
  );
}
