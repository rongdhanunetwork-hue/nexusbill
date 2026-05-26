import { db } from "@/db";
import { users, payments, invoices, mikrotiks, olts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import AdminDashboardClient from "./AdminDashboardClient";
import { getPppoeActive } from "@/lib/mikrotik";
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
  // Sync MikroTik secrets to DB first
  await syncMikrotikSecrets();

  // Fetch active PPPoE usernames from MikroTik router
  let activePppoeNames: string[] = [];
  try {
    const activeSessions = await getPppoeActive();
    activePppoeNames = activeSessions.map((s) => s.name);
  } catch (err) {
    console.error("Failed to fetch active sessions from MikroTik:", err);
  }

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

  // Calculate online customers based on active secrets in MikroTik
  const onlineCustomers = allDbCustomers.filter(c => {
    return c.status === "active" && c.pppoeUsername && activePppoeNames.includes(c.pppoeUsername);
  }).length;

  const offlineCustomers = Math.max(0, activeCustomers - onlineCustomers);

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
      upcomingExpires={upcomingExpires}
    />
  );
}
