import { db } from "@/db";
import { payments, users, invoices } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { CheckCircle, Clock, DollarSign, FileText, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

async function approvePayment(formData: FormData) {
  "use server";
  const paymentId = Number(formData.get("paymentId"));
  const userId = Number(formData.get("userId"));
  const amount = String(formData.get("amount") || "0");
  if (!paymentId || !userId) return;

  const customer = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  await db.update(payments).set({ status: "approved" }).where(eq(payments.id, paymentId));
  await db.update(users).set({ status: "active", expireDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }).where(eq(users.id, userId));
  await db.insert(invoices).values({ userId, amount, status: "paid", dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });

  if (customer && customer.pppoeUsername) {
    const { syncCustomerToMikrotik } = await import("@/lib/sync");
    await syncCustomerToMikrotik(
      customer.pppoeUsername,
      undefined, // password stays same
      customer.packageId,
      "active"
    );
  }

  revalidatePath("/admin/billing");
}

async function rejectPayment(formData: FormData) {
  "use server";
  const paymentId = Number(formData.get("paymentId"));
  if (paymentId) await db.update(payments).set({ status: "rejected" }).where(eq(payments.id, paymentId));
  revalidatePath("/admin/billing");
}

async function generateMonthlyBills() {
  "use server";
  const customers = await db.query.users.findMany({ where: eq(users.role, "customer"), with: { package: true } });
  for (const customer of customers) {
    if (customer.package?.price) {
      await db.insert(invoices).values({ userId: customer.id, amount: customer.package.price, status: "unpaid", dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    }
  }
  revalidatePath("/admin/billing");
}

export default async function BillingPage() {
  const pendingPayments = await db.query.payments.findMany({ where: eq(payments.status, "pending"), orderBy: [desc(payments.createdAt)], with: { user: true } });
  const paymentHistory = await db.query.payments.findMany({ orderBy: [desc(payments.createdAt)], limit: 15, with: { user: true } });
  const dueInvoices = await db.query.invoices.findMany({ where: sql`${invoices.status} in ('unpaid','due')`, orderBy: [desc(invoices.createdAt)], with: { user: true } });
  const [dueTotal] = await db.select({ sum: sql<number>`cast(coalesce(sum(${invoices.amount}),0) as int)` }).from(invoices).where(sql`${invoices.status} in ('unpaid','due')`);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white tracking-wide">Billing & Payment Management</h1>
        <form action={generateMonthlyBills}><button className="glass-button px-5 py-2.5 text-neon-blue border-neon-blue/30 flex items-center gap-2"><FileText size={18} /> Generate Monthly Bill</button></form>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Stat icon={<Clock />} label="Pending Payment" value={pendingPayments.length.toString()} color="text-yellow-400" />
        <Stat icon={<AlertTriangle />} label="Due List" value={dueInvoices.length.toString()} color="text-red-400" />
        <Stat icon={<DollarSign />} label="Due Amount" value={`৳${dueTotal?.sum || 0}`} color="text-neon-red" />
        <Stat icon={<CheckCircle />} label="Payment History" value={paymentHistory.length.toString()} color="text-neon-green" />
      </div>

      <Table title="Pending Payment - Transaction ID Verify" headers={["Customer", "Amount", "Method", "Transaction ID", "Screenshot", "Actions"]}>
        {pendingPayments.length === 0 ? <Empty colSpan={6} text="No pending payments." /> : pendingPayments.map(payment => (
          <tr key={payment.id} className="hover:bg-white/5">
            <td className="p-4"><div className="font-medium text-white">{payment.user?.name || "Unknown"}</div><div className="text-sm text-gray-400">{payment.user?.phone}</div></td>
            <td className="p-4 text-white font-bold">৳{payment.amount}</td>
            <td className="p-4 text-gray-300 capitalize">{payment.method || "N/A"}</td>
            <td className="p-4 text-neon-blue font-mono">{payment.trxId || "N/A"}</td>
            <td className="p-4 text-gray-400">{payment.screenshotUrl ? "Uploaded" : "Optional/No"}</td>
            <td className="p-4"><div className="flex gap-2">
              <form action={approvePayment}><input type="hidden" name="paymentId" value={payment.id} /><input type="hidden" name="userId" value={payment.userId} /><input type="hidden" name="amount" value={payment.amount} /><button className="px-3 py-1.5 bg-neon-green/20 text-neon-green rounded-lg text-sm border border-neon-green/30">Approve</button></form>
              <form action={rejectPayment}><input type="hidden" name="paymentId" value={payment.id} /><button className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm border border-red-500/30">Reject</button></form>
            </div></td>
          </tr>
        ))}
      </Table>

      <Table title="Due List / Unpaid Bills" headers={["Invoice", "Customer", "Amount", "Due Date", "Status"]}>
        {dueInvoices.length === 0 ? <Empty colSpan={5} text="No due invoices." /> : dueInvoices.map(invoice => (
          <tr key={invoice.id} className="hover:bg-white/5"><td className="p-4 text-white font-mono">INV-{invoice.id}</td><td className="p-4 text-gray-300">{invoice.user?.name}</td><td className="p-4 text-white font-bold">৳{invoice.amount}</td><td className="p-4 text-gray-400">{invoice.dueDate?.toLocaleDateString()}</td><td className="p-4 text-orange-400 capitalize">{invoice.status}</td></tr>
        ))}
      </Table>

      <Table title="Payment History / Invoice" headers={["Customer", "Amount", "Method", "Trx ID", "Status", "Date"]}>
        {paymentHistory.length === 0 ? <Empty colSpan={6} text="No payments yet." /> : paymentHistory.map(payment => (
          <tr key={payment.id} className="hover:bg-white/5"><td className="p-4 text-white">{payment.user?.name}</td><td className="p-4 text-white font-bold">৳{payment.amount}</td><td className="p-4 text-gray-300 capitalize">{payment.method}</td><td className="p-4 text-gray-300 font-mono">{payment.trxId}</td><td className="p-4 capitalize"><span className={payment.status === "approved" ? "text-neon-green" : payment.status === "rejected" ? "text-red-400" : "text-yellow-400"}>{payment.status}</span></td><td className="p-4 text-gray-400">{payment.createdAt?.toLocaleDateString()}</td></tr>
        ))}
      </Table>
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color: string }) { return <div className="glass-card p-5 flex items-center gap-4"><div className={`p-3 rounded-xl bg-white/10 ${color}`}>{icon}</div><div><p className="text-gray-400 text-sm">{label}</p><p className="text-2xl font-bold text-white">{value}</p></div></div>; }
function Table({ title, headers, children }: { title: string; headers: string[]; children: ReactNode }) { return <div className="glass-card overflow-hidden"><div className="p-5 border-b border-white/10 bg-white/5"><h2 className="text-lg font-semibold text-white">{title}</h2></div><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-white/10 text-sm font-semibold text-gray-400 uppercase tracking-wider bg-white/5">{headers.map(h => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{children}</tbody></table></div></div>; }
function Empty({ colSpan, text }: { colSpan: number; text: string }) { return <tr><td colSpan={colSpan} className="p-8 text-center text-gray-500">{text}</td></tr>; }
