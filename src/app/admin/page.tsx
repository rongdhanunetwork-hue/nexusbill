import { db } from "@/db";
import { users, payments, invoices, mikrotiks, olts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import AdminDashboardClient from "./AdminDashboardClient";
import { syncMikrotikSecrets } from "@/lib/sync";

export const dynamic = "force-dynamic";

async function countExpiredDays(days: number) {
  const [result] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(users)
    .where(sql`${users.role} = 'customer' and ${users.expireDate}::date = (current_date - ${days}::int)`);
  return result?.count || 0;
}

export default async function AdminDashboard() {
  // Sync MikroTik secrets to DB in the background
  syncMikrotikSecrets().catch((err) => {
    console.error("Background MikroTik sync error:", err);
  });

  const [
    allDbCustomers,
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
    db.select({ id: users.id, status: users.status, pppoeUsername: users.pppoeUsername, expireDate: users.expireDate }).from(users).where(eq(users.role, "customer")),
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

  const totalCustomers = allDbCustomers.length;
  const activeCustomers = allDbCustomers.filter(c => c.status === "active").length;
  const expiredCustomers = allDbCustomers.filter(c => c.status === "expired").length;

  const now = new Date();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const upcomingExpires = allDbCustomers.filter(c => {
    if (c.status !== "active" || !c.expireDate) return false;
    const exp = new Date(c.expireDate);
    return exp > now && exp <= nextWeek;
  }).length;

  return (
    <AdminDashboardClient
      totalCustomers={totalCustomers}
      activeCustomers={activeCustomers}
      onlineCustomers={0}
      offlineCustomers={activeCustomers}
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
      upcomingExpires={upcomingExpires}
    />
  );
}
