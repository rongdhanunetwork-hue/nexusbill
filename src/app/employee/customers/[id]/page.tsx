import { db } from "@/db";
import { users, payments, invoices, dataUsage } from "@/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getRouterDetails } from "@/lib/mikrotik";
import CustomerProfileClient from "@/app/admin/customers/[id]/CustomerProfileClient";

export const dynamic = "force-dynamic";

export default async function EmployeeCustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customerId = Number(id);
  const customer = await db.query.users.findFirst({
    where: eq(users.id, customerId),
    with: { package: true, mikrotik: true }
  });
  if (!customer) notFound();

  // Fetch active PPPoE session details and secrets from MikroTik router
  let isOnline = false;
  let activeSession: any = null;
  let plainTextPassword = "";
  try {
    const details = await getRouterDetails(customer.mikrotikId || undefined);
    const activeSessions = details.active;
    const secrets = details.secrets;

    if (customer.pppoeUsername) {
      activeSession = activeSessions.find(
        (s) => s.name.toLowerCase() === customer.pppoeUsername!.toLowerCase()
      ) || null;
      isOnline = !!activeSession;

      const secretMatch = secrets.find(
        (s) => s.name.toLowerCase() === customer.pppoeUsername!.toLowerCase()
      );
      if (secretMatch && secretMatch.password) {
        plainTextPassword = secretMatch.password;
      }
    }
  } catch (err) {
    console.error("Failed to check active session and secrets for user in profile page:", err);
  }

  const customerPayments = await db.query.payments.findMany({ where: eq(payments.userId, customerId), orderBy: [desc(payments.createdAt)], limit: 8 });
  const customerInvoices = await db.query.invoices.findMany({ where: eq(invoices.userId, customerId), orderBy: [desc(invoices.createdAt)], limit: 8 });
  
  // Fetch real data usage
  const rawUsage = await db.query.dataUsage.findMany({
    where: eq(dataUsage.userId, customerId),
    orderBy: [desc(dataUsage.recordedAt)],
    limit: 7,
  });

  // Build 7-day chart data chronologically
  const last7DaysUsage = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const yyyymmdd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const match = rawUsage.find((u) => {
      if (!u.recordedAt) return false;
      const rd = new Date(u.recordedAt);
      const rdStr = `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, "0")}-${String(rd.getDate()).padStart(2, "0")}`;
      return rdStr === yyyymmdd;
    });

    return {
      recordedAt: d,
      downloadGb: match ? String(match.downloadGb || 0) : "0",
      uploadGb: match ? String(match.uploadGb || 0) : "0",
    };
  });

  // Fetch real monthly total usage from DB (current calendar month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [monthlyUsageResult] = await db
    .select({
      downloadSum: sql<number>`cast(coalesce(sum(${dataUsage.downloadGb}), 0) as float)`,
      uploadSum: sql<number>`cast(coalesce(sum(${dataUsage.uploadGb}), 0) as float)`
    })
    .from(dataUsage)
    .where(
      and(
        eq(dataUsage.userId, customerId),
        gte(dataUsage.recordedAt, startOfMonth)
      )
    );
  
  const monthlyDownloadGb = monthlyUsageResult?.downloadSum || 0;
  const monthlyUploadGb = monthlyUsageResult?.uploadSum || 0;

  return (
    <CustomerProfileClient
      customer={customer as any}
      payments={customerPayments as any}
      invoices={customerInvoices as any}
      usageHistory={last7DaysUsage as any}
      isOnline={isOnline}
      activeSession={activeSession}
      plainTextPassword={plainTextPassword}
      role="employee"
      monthlyDownloadGb={monthlyDownloadGb}
      monthlyUploadGb={monthlyUploadGb}
    />
  );
}
