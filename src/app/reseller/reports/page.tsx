import { db } from "@/db";
import { payments, users, invoices, transactions } from "@/db/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import ReportsClient from "@/app/admin/reports/ReportsClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ResellerReportsPage() {
  const session = await getSession();
  if (!session || session.role !== "reseller") {
    redirect("/login/reseller");
  }

  const resellerId = session.userId;

  const customers = await db.query.users.findMany({
    where: and(eq(users.role, "customer"), eq(users.resellerId, resellerId)),
    orderBy: [desc(users.createdAt)],
  });

  const customerIds = customers.map(c => c.id);

  let approvedPayments: any[] = [];
  let dueInvoices: any[] = [];

  if (customerIds.length > 0) {
    approvedPayments = await db.query.payments.findMany({
      where: and(eq(payments.status, "approved"), inArray(payments.userId, customerIds)),
      orderBy: [desc(payments.createdAt)],
      with: {
        user: true,
      },
    });

    dueInvoices = await db.query.invoices.findMany({
      where: and(sql`${invoices.status} in ('unpaid', 'due')`, inArray(invoices.userId, customerIds)),
      orderBy: [desc(invoices.createdAt)],
      with: {
        user: true,
      },
    });
  }

  const allTransactions = await db.query.transactions.findMany({
    where: eq(transactions.resellerId, resellerId),
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
      role="reseller"
    />
  );
}
