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
  const [totalCustomersResult] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(users)
    .where(eq(users.role, "customer"));

  const totalCustomers = totalCustomersResult?.count || 0;
  const activeCustomers = await countUsersByStatus("active");
  const onlineCustomers = await countUsersByStatus("online");
  const offlineCustomers = await countUsersByStatus("offline");
  const expiredCustomers = await countUsersByStatus("expired");
  const expired1Day = await countExpiredDays(1);
  const expired2Day = await countExpiredDays(2);
  const expired3Day = await countExpiredDays(3);
  const expired4Day = await countExpiredDays(4);

  const [todayRechargeResult] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(payments)
    .where(sql`${payments.status} = 'approved' and ${payments.createdAt}::date = current_date`);

  const [collectionResult] = await db
    .select({ sum: sql<number>`cast(coalesce(sum(${payments.amount}), 0) as int)` })
    .from(payments)
    .where(eq(payments.status, "approved"));

  const [dueResult] = await db
    .select({ sum: sql<number>`cast(coalesce(sum(${invoices.amount}), 0) as int)` })
    .from(invoices)
    .where(sql`${invoices.status} in ('unpaid', 'due')`);

  const [routerResult] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(mikrotiks);
  const [oltResult] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(olts);

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
      todayRecharge={todayRechargeResult?.count || 0}
      totalizerCollection={collectionResult?.sum || 0}
      dueAmount={dueResult?.sum || 0}
      routerCount={routerResult?.count || 0}
      oltCount={oltResult?.count || 0}
    />
  );
}
