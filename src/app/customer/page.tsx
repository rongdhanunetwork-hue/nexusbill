import { db } from "@/db";
import { users, invoices, notices, dataUsage } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import CustomerDashboardClient from "./CustomerDashboardClient";

export const dynamic = "force-dynamic";

export default async function CustomerDashboard() {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    redirect("/login/customer");
  }

  const customer = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    with: { package: true },
  });

  if (!customer) {
    redirect("/login/customer");
  }

  const [dueResult] = await db
    .select({ sum: sql<number>`cast(coalesce(sum(${invoices.amount}),0) as int)` })
    .from(invoices)
    .where(sql`${invoices.userId} = ${customer.id} and ${invoices.status} in ('unpaid','due')`);

  // Count total invoices to detect customers who have never been recharged
  const [invoiceCountResult] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(invoices)
    .where(sql`${invoices.userId} = ${customer.id}`);

  const totalInvoiceCount = invoiceCountResult?.count || 0;
  const dueAmount = dueResult?.sum || 0;

  // Show "Unpaid" if:
  // 1. They have outstanding due amounts, OR
  // 2. They have never been recharged (no invoices) AND no expiry date (account never activated)
  const neverRecharged = totalInvoiceCount === 0 && !customer.expireDate;
  const billStatus = (dueAmount > 0 || neverRecharged) ? "Unpaid" : "Paid";

  const latestNotice = await db.query.notices.findFirst({ orderBy: [desc(notices.createdAt)] });

  // Fetch real daily data usage (last 7 days) for the customer
  const rawUsage = await db.query.dataUsage.findMany({
    where: eq(dataUsage.userId, customer.id),
    orderBy: [desc(dataUsage.recordedAt)],
    limit: 7,
  });

  // Build 7-day chart data regardless of how many usage records exist
  const last7DaysUsage = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleString("default", { weekday: "short" });
    const yyyymmdd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const match = rawUsage.find((u) => {
      if (!u.recordedAt) return false;
      const rd = new Date(u.recordedAt);
      const rdStr = `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, "0")}-${String(rd.getDate()).padStart(2, "0")}`;
      return rdStr === yyyymmdd;
    });

    return {
      day: label,
      download: match ? parseFloat(String(match.downloadGb || 0)) : 0,
      upload: match ? parseFloat(String(match.uploadGb || 0)) : 0,
      hasReal: true, // Display the chart with populated real/0 data
    };
  });

  // Calculate current credit based on remaining days
  let currentCredit = 0;
  if (customer.expireDate && customer.package) {
    const pkgPrice = parseFloat(String(customer.package.price || 0));
    const pkgDuration = customer.package.durationDays || 30;
    const dailyCost = pkgDuration > 0 ? pkgPrice / pkgDuration : 0;
    
    const now = new Date();
    const expire = new Date(customer.expireDate);
    const diffTime = expire.getTime() - now.getTime();
    if (diffTime > 0) {
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      currentCredit = diffDays * dailyCost;
    }
  }

  return (
    <CustomerDashboardClient
      customerName={customer.name}
      packageName={customer.package?.name || "No Package"}
      packageSpeed={customer.package?.speed || "N/A"}
      expireDate={customer.expireDate?.toISOString() || null}
      billStatus={billStatus}
      dueAmount={dueAmount}
      noticeTitle={latestNotice?.title || null}
      noticeMessage={latestNotice?.message || null}
      noticeImageUrl={latestNotice?.imageUrl || null}
      status={customer.status || "active"}
      usageData={last7DaysUsage}
      pppoeUsername={customer.pppoeUsername || null}
      currentCredit={currentCredit}
    />
  );
}
