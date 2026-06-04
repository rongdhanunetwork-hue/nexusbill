import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, payments, invoices, mikrotiks, olts, dataUsage } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function countExpiredDaysEmployee(adminId: number, days: number) {
  const [result] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(users)
    .where(sql`${users.role} = 'customer' and ${users.adminId} = ${adminId} and ${users.expireDate}::date = (current_date - ${days}::int)`);
  return result?.count || 0;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get employee's adminId
  const empUser = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: { adminId: true }
  });
  const adminId = empUser?.adminId || session.userId;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  try {
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
      oltResult,
      paidUsersThisMonthResult
    ] = await Promise.all([
      db.query.users.findMany({
        where: and(eq(users.role, "customer"), eq(users.adminId, adminId)),
        with: { package: true }
      }),
      countExpiredDaysEmployee(adminId, 1),
      countExpiredDaysEmployee(adminId, 2),
      countExpiredDaysEmployee(adminId, 3),
      countExpiredDaysEmployee(adminId, 4),
      db.select({ count: sql<number>`cast(count(*) as int)` })
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

    const paidUserIds = new Set(paidUsersThisMonthResult.map(r => r.userId));
    const paidThisMonthCount = allDbCustomers.filter(c => c.status === "active" && paidUserIds.has(c.id)).length;
    const unpaidThisMonthCount = Math.max(0, activeCustomers - paidThisMonthCount);

    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingExpires = allDbCustomers.filter(c => {
      if (c.status !== "active" || !c.expireDate) return false;
      const exp = new Date(c.expireDate);
      return exp > now && exp <= nextWeek;
    }).length;

    const newCustomersThisMonth = allDbCustomers
      .filter(c => c.createdAt && new Date(c.createdAt) >= startOfMonth)
      .map(c => ({ id: c.id, name: c.name, phone: c.phone, pppoeUsername: c.pppoeUsername, createdAt: c.createdAt, expireDate: c.expireDate, status: c.status, package: c.package ? { name: c.package.name } : null }));

    const expiringToday = allDbCustomers
      .filter(c => { if (!c.expireDate) return false; const exp = new Date(c.expireDate); return exp >= startOfToday && exp <= endOfToday; })
      .map(c => ({ id: c.id, name: c.name, phone: c.phone, pppoeUsername: c.pppoeUsername, createdAt: c.createdAt, expireDate: c.expireDate, status: c.status, package: c.package ? { name: c.package.name } : null }));

    // Daily usage (last 7 days)
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
      const dbMatch = dailyUsageResult.find(r => r.dayDate === yyyymmdd);
      last7Days.push({ name, download: dbMatch?.downloadSum || 0, upload: dbMatch?.uploadSum || 0 });
    }

    return NextResponse.json({
      totalCustomers, activeCustomers, expiredCustomers,
      expired1Day, expired2Day, expired3Day, expired4Day,
      expectedCollection,
      todayCollection: 0,
      todayRecharge: todayRechargeResult[0]?.count || 0,
      totalizerCollection: collectionResult[0]?.sum || 0,
      dueAmount: dueResult[0]?.sum || 0,
      businessBalance: 0,
      totalExpense: 0,
      paidThisMonthCount, unpaidThisMonthCount,
      connectionFeeToday: 0, totalConnectionFee: 0,
      upcomingExpires,
      routerCount: routerResult[0]?.count || 0,
      oltCount: oltResult[0]?.count || 0,
      newCustomersThisMonth, expiringToday,
      monthlyIncomeData: [],
      dailyUsageData: last7Days,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Employee dashboard stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
