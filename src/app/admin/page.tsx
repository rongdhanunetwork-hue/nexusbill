import { db } from "@/db";
import { users, payments, invoices, mikrotiks, olts, dataUsage, expenses } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import AdminDashboardClient from "./AdminDashboardClient";
import { syncMikrotikSecrets } from "@/lib/sync";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function countExpiredDays(days: number, adminId: number) {
  const [result] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(users)
    .where(sql`${users.role} = 'customer' and ${users.adminId} = ${adminId} and ${users.expireDate}::date = (current_date - ${days}::int)`);
  return result?.count || 0;
}

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    redirect("/login");
  }

  const adminId = session.userId;

  // Sync MikroTik secrets to DB in the background
  syncMikrotikSecrets().catch((err) => {
    console.error("Background MikroTik sync error:", err);
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [
    allDbCustomers,
    expired1Day,
    expired2Day,
    expired3Day,
    expired4Day,
    todayRechargeResult,
    todayCollectionResult,
    collectionResult,
    dueResult,
    routerResult,
    oltResult,
    expenseResult,
    paidUsersThisMonthResult
  ] = await Promise.all([
    db.query.users.findMany({
      where: and(eq(users.role, "customer"), eq(users.adminId, adminId)),
      with: { package: true }
    }),
    countExpiredDays(1, adminId),
    countExpiredDays(2, adminId),
    countExpiredDays(3, adminId),
    countExpiredDays(4, adminId),
    db.select({ count: sql<number>`cast(count(*) as int)` })
      .from(payments)
      .innerJoin(users, eq(payments.userId, users.id))
      .where(sql`${payments.status} = 'approved' and ${payments.createdAt}::date = current_date and ${users.adminId} = ${adminId}`),
    db.select({ sum: sql<number>`cast(coalesce(sum(${payments.amount}), 0) as int)` })
      .from(payments)
      .innerJoin(users, eq(payments.userId, users.id))
      .where(sql`${payments.status} = 'approved' and ${payments.createdAt}::date = current_date and ${users.adminId} = ${adminId}`),
    db.select({ sum: sql<number>`cast(coalesce(sum(${payments.amount}), 0) as int)` })
      .from(payments)
      .innerJoin(users, eq(payments.userId, users.id))
      .where(sql`${payments.status} = 'approved' and ${payments.createdAt} >= ${startOfMonth} and ${users.adminId} = ${adminId}`),
    db.select({ sum: sql<number>`cast(coalesce(sum(${invoices.amount}), 0) as int)` })
      .from(invoices)
      .innerJoin(users, eq(invoices.userId, users.id))
      .where(sql`${invoices.status} in ('unpaid', 'due') and ${invoices.createdAt} >= ${startOfMonth} and ${users.adminId} = ${adminId}`),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(mikrotiks).where(eq(mikrotiks.adminId, adminId)),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(olts).where(eq(olts.adminId, adminId)),
    db.select({ sum: sql<number>`cast(coalesce(sum(${expenses.amount}), 0) as int)` }).from(expenses).where(sql`${expenses.expenseDate} >= ${startOfMonth} and ${expenses.adminId} = ${adminId}`),
    db.select({ userId: payments.userId })
      .from(payments)
      .innerJoin(users, eq(payments.userId, users.id))
      .where(sql`${payments.status} = 'approved' and ${payments.createdAt} >= ${startOfMonth} and ${users.adminId} = ${adminId}`),
  ]);

  const totalCustomers = allDbCustomers.length;
  const activeCustomers = allDbCustomers.filter(c => c.status === "active").length;
  const expiredCustomers = allDbCustomers.filter(c => c.status === "expired").length;

  const activeCustomersList = allDbCustomers.filter(c => c.status === "active");
  const expectedCollection = activeCustomersList.reduce((sum, c) => {
    const price = c.package ? parseFloat(c.package.price) : 0;
    return sum + price;
  }, 0);

  const todayCollection = todayCollectionResult[0]?.sum || 0;
  const totalExpense = expenseResult[0]?.sum || 0;
  const businessBalance = (collectionResult[0]?.sum || 0) - totalExpense;

  const paidUserIds = new Set(paidUsersThisMonthResult.map(r => r.userId));
  const paidThisMonthCount = allDbCustomers.filter(c => c.status === "active" && paidUserIds.has(c.id)).length;
  const unpaidThisMonthCount = Math.max(0, activeCustomers - paidThisMonthCount);

  const totalConnectionFee = allDbCustomers.reduce((sum, c) => sum + (c.connectionFee ? parseFloat(c.connectionFee) : 0), 0);
  const connectionFeeToday = allDbCustomers
    .filter(c => c.createdAt && new Date(c.createdAt) >= startOfToday)
    .reduce((sum, c) => sum + (c.connectionFee ? parseFloat(c.connectionFee) : 0), 0);

  const now = new Date();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const upcomingExpires = allDbCustomers.filter(c => {
    if (c.status !== "active" || !c.expireDate) return false;
    const exp = new Date(c.expireDate);
    return exp > now && exp <= nextWeek;
  }).length;

  // Running Month New Users
  const newCustomersThisMonth = allDbCustomers.filter(c => {
    if (!c.createdAt) return false;
    return new Date(c.createdAt) >= startOfMonth;
  });

  // Today Expired (Expires Today)
  const expiringToday = allDbCustomers.filter(c => {
    if (!c.expireDate) return false;
    const exp = new Date(c.expireDate);
    return exp >= startOfToday && exp <= endOfToday;
  });

  // Fetch monthly income data from DB (last 6 months)
  const monthlyIncomeResult = await db
    .select({
      monthYear: sql<string>`to_char(${payments.createdAt}, 'YYYY-MM')`,
      total: sql<number>`cast(coalesce(sum(${payments.amount}), 0) as int)`
    })
    .from(payments)
    .innerJoin(users, eq(payments.userId, users.id))
    .where(and(eq(payments.status, "approved"), eq(users.adminId, adminId)))
    .groupBy(sql`to_char(${payments.createdAt}, 'YYYY-MM')`);

  const last6Months = [];
  const tempDate = new Date();
  tempDate.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(tempDate.getFullYear(), tempDate.getMonth() - i, 1);
    const yyyymm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const name = d.toLocaleString("default", { month: "short" });
    last6Months.push({ name, income: 0, yyyymm });
  }

  last6Months.forEach(m => {
    const dbMatch = monthlyIncomeResult.find(r => r.monthYear === m.yyyymm);
    if (dbMatch) {
      m.income = dbMatch.total;
    }
  });

  // Query daily usage from data_usage (last 7 days)
  const dailyUsageResult = await db
    .select({
      dayDate: sql<string>`to_char(${dataUsage.recordedAt}, 'YYYY-MM-DD')`,
      downloadSum: sql<number>`cast(coalesce(sum(${dataUsage.downloadGb}), 0) as float)`,
      uploadSum: sql<number>`cast(coalesce(sum(${dataUsage.uploadGb}), 0) as float)`
    })
    .from(dataUsage)
    .innerJoin(users, eq(dataUsage.userId, users.id))
    .where(sql`${dataUsage.recordedAt} >= current_date - interval '7 days' and ${users.adminId} = ${adminId}`)
    .groupBy(sql`to_char(${dataUsage.recordedAt}, 'YYYY-MM-DD')`);

  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const yyyymmdd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const name = d.toLocaleString("default", { weekday: "short" });
    last7Days.push({ name, download: 0, upload: 0, yyyymmdd });
  }

  last7Days.forEach(day => {
    const dbMatch = dailyUsageResult.find(r => r.dayDate === day.yyyymmdd);
    if (dbMatch) {
      day.download = dbMatch.downloadSum;
      day.upload = dbMatch.uploadSum;
    }
  });

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
      todayCollection={todayCollection}
      expectedCollection={expectedCollection}
      paidThisMonthCount={paidThisMonthCount}
      unpaidThisMonthCount={unpaidThisMonthCount}
      connectionFeeToday={connectionFeeToday}
      totalConnectionFee={totalConnectionFee}
      businessBalance={businessBalance}
      totalExpense={totalExpense}
      totalizerCollection={collectionResult[0]?.sum || 0}
      dueAmount={dueResult[0]?.sum || 0}
      routerCount={routerResult[0]?.count || 0}
      oltCount={oltResult[0]?.count || 0}
      upcomingExpires={upcomingExpires}
      newCustomersThisMonth={newCustomersThisMonth as any[]}
      expiringToday={expiringToday as any[]}
      monthlyIncomeData={last6Months.map(({ name, income }) => ({ name, income }))}
      dailyUsageData={last7Days.map(({ name, download, upload }) => ({ name, download, upload }))}
    />
  );
}
