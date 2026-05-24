import { db } from "@/db";
import { users, payments, invoices, mikrotiks, olts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

async function countUsersByStatus(status: string) {
  const [result] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(users)
    .where(sql`${users.role} = 'customer' and ${users.status} = ${status}`);
  return result?.count || 0;
}

async function countExpiredDays(days: number) {
  const [result] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(users)
    .where(sql`${users.role} = 'customer' and ${users.expireDate}::date = (current_date - ${days}::int)`);
  return result?.count || 0;
}

export default async function AdminDashboard() {
  const [
    totalCustomersResult,
    activeCustomers,
    onlineCustomers,
    offlineCustomers,
    expiredCustomers,
    expired1Day,
    expired2Day,
    expired3Day,
    expired4Day,
    todayRechargeResult,
    collectionResult,
    dueResult,
    routerResult,
    oltResult
  ] = await Promise.all([
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(users).where(eq(users.role, "customer")),
    countUsersByStatus("active"),
    countUsersByStatus("online"),
    countUsersByStatus("offline"),
    countUsersByStatus("expired"),
    countExpiredDays(1),
    countExpiredDays(2),
    countExpiredDays(3),
    countExpiredDays(4),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(payments).where(sql`${payments.status} = 'approved' and ${payments.createdAt}::date = current_date`),
    db.select({ sum: sql<number>`cast(coalesce(sum(${payments.amount}), 0) as int)` }).from(payments).where(eq(payments.status, "approved")),
    db.select({ sum: sql<number>`cast(coalesce(sum(${invoices.amount}), 0) as int)` }).from(invoices).where(sql`${invoices.status} in ('unpaid', 'due')`),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(mikrotiks),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(olts),
  ]);

  const totalCustomers = totalCustomersResult[0]?.count || 0;

  return (
    <AdminDashboardClient
      totalCustomers={totalCustomers}
      activeCustomers={activeCustomers}
      onlineCustomers={onlineCustomers}
      offlineCustomers={offlineCustomers}
      expiredCustomers={expiredCustomers}
      expired1Day={expired1Day}
      expired2Day={expired2Day}
      expired3Day={expired3Day}
      expired4Day={expired4Day}
      todayRecharge={todayRechargeResult[0]?.count || 0}
      totalizerCollection={collectionResult[0]?.sum || 0}
      dueAmount={dueResult[0]?.sum || 0}
      routerCount={routerResult[0]?.count || 0}
      oltCount={oltResult[0]?.count || 0}
    />
  );
}
