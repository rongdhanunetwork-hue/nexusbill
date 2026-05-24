import { db } from "@/db";
import { users, invoices, notices } from "@/db/schema";
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

  const latestNotice = await db.query.notices.findFirst({ orderBy: [desc(notices.createdAt)] });

  return (
    <CustomerDashboardClient
      customerName={customer.name}
      packageName={customer.package?.name || "No Package"}
      packageSpeed={customer.package?.speed || "N/A"}
      expireDate={customer.expireDate?.toISOString() || null}
      billStatus={(dueResult?.sum || 0) > 0 ? "Unpaid" : "Paid"}
      dueAmount={dueResult?.sum || 0}
      noticeTitle={latestNotice?.title || null}
      noticeMessage={latestNotice?.message || null}
      status={customer.status || "active"}
    />
  );
}
