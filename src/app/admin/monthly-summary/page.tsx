import { db } from "@/db";
import { payments, expenses, users } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import MonthlySummaryClient from "./MonthlySummaryClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MonthlySummaryPage() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    redirect("/login");
  }
  const adminId = session.userId;

  // Group payments by month
  const monthlyIncomes = await db
    .select({
      monthYear: sql<string>`to_char(${payments.createdAt}, 'YYYY-MM')`,
      totalIncome: sql<number>`cast(coalesce(sum(${payments.amount}), 0) as int)`
    })
    .from(payments)
    .innerJoin(users, eq(payments.userId, users.id))
    .where(and(eq(payments.status, "approved"), eq(users.adminId, adminId)))
    .groupBy(sql`to_char(${payments.createdAt}, 'YYYY-MM')`);

  // Group expenses by month
  const monthlyExpenses = await db
    .select({
      monthYear: sql<string>`to_char(${expenses.createdAt}, 'YYYY-MM')`,
      totalExpense: sql<number>`cast(coalesce(sum(${expenses.amount}), 0) as int)`
    })
    .from(expenses)
    .where(eq(expenses.adminId, adminId))
    .groupBy(sql`to_char(${expenses.createdAt}, 'YYYY-MM')`);

  // Group new customers by month
  const monthlyNewCustomers = await db
    .select({
      monthYear: sql<string>`to_char(${users.createdAt}, 'YYYY-MM')`,
      totalCustomers: sql<number>`cast(count(*) as int)`
    })
    .from(users)
    .where(and(eq(users.role, "customer"), eq(users.adminId, adminId)))
    .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM')`);

  // Merge all data by monthYear
  const summaryMap = new Map<string, any>();

  monthlyIncomes.forEach((inc) => {
    summaryMap.set(inc.monthYear, { monthYear: inc.monthYear, totalIncome: inc.totalIncome, totalExpense: 0, newCustomers: 0 });
  });

  monthlyExpenses.forEach((exp) => {
    if (!summaryMap.has(exp.monthYear)) {
      summaryMap.set(exp.monthYear, { monthYear: exp.monthYear, totalIncome: 0, totalExpense: exp.totalExpense, newCustomers: 0 });
    } else {
      summaryMap.get(exp.monthYear).totalExpense = exp.totalExpense;
    }
  });

  monthlyNewCustomers.forEach((cus) => {
    if (!summaryMap.has(cus.monthYear)) {
      summaryMap.set(cus.monthYear, { monthYear: cus.monthYear, totalIncome: 0, totalExpense: 0, newCustomers: cus.totalCustomers });
    } else {
      summaryMap.get(cus.monthYear).newCustomers = cus.totalCustomers;
    }
  });

  const summaries = Array.from(summaryMap.values()).sort((a, b) => b.monthYear.localeCompare(a.monthYear));

  // Remove the current month if we only want "past" summaries? No, let's show all.

  return <MonthlySummaryClient initialData={summaries} />;
}
