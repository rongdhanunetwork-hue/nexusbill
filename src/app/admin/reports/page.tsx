import { db } from "@/db";
import { payments, users, invoices } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
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

  return (
    <ReportsClient
      approvedPayments={approvedPayments}
      dueInvoices={dueInvoices}
      customers={customers}
    />
  );
}
