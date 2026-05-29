import { db } from "@/db";
import { payments, users, invoices } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { CheckCircle, Clock, DollarSign, FileText, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function EmployeeBillingPage() {
  const pendingPayments = await db.query.payments.findMany({ where: eq(payments.status, "pending"), orderBy: [desc(payments.createdAt)], with: { user: true } });
  const paymentHistory = await db.query.payments.findMany({ orderBy: [desc(payments.createdAt)], limit: 15, with: { user: true } });
  const dueInvoices = await db.query.invoices.findMany({ where: sql`${invoices.status} in ('unpaid','due')`, orderBy: [desc(invoices.createdAt)], with: { user: true } });
  const [dueTotal] = await db.select({ sum: sql<number>`cast(coalesce(sum(${invoices.amount}),0) as int)` }).from(invoices).where(sql`${invoices.status} in ('unpaid','due')`);

  const resellersList = await db.query.users.findMany({
    where: eq(users.role, "reseller"),
    orderBy: [desc(users.id)],
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white tracking-wide">Billing & Payment Overview</h1>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Stat icon={<Clock />} label="Pending Payment" value={pendingPayments.length.toString()} color="text-yellow-400" />
        <Stat icon={<AlertTriangle />} label="Due List" value={dueInvoices.length.toString()} color="text-red-400" />
        <Stat icon={<DollarSign />} label="Due Amount" value={`৳${dueTotal?.sum || 0}`} color="text-red-400" />
        <Stat icon={<CheckCircle />} label="Payment History" value={paymentHistory.length.toString()} color="text-orange-400" />
      </div>

      {/* Reseller Wallets Summary (Read-Only) */}
      <div className="max-w-2xl">
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/10 bg-white/5">
            <h2 className="text-lg font-semibold text-white">Reseller Wallet Balances</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold text-gray-400 uppercase bg-white/5">
                  <th className="p-4">Reseller</th>
                  <th className="p-4">Wallet Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {resellersList.length === 0 ? (
                  <tr><td colSpan={2} className="p-8 text-center text-gray-500">No resellers registered.</td></tr>
                ) : resellersList.map(r => (
                  <tr key={r.id} className="hover:bg-white/5">
                    <td className="p-4 text-white">
                      <div className="font-bold">{r.name}</div>
                      <div className="text-xs text-gray-400">{r.phone}</div>
                    </td>
                    <td className="p-4 text-orange-450 font-bold">৳{r.walletBalance || "0.00"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Table title="Pending Payment Requests" headers={["Customer", "Amount", "Method", "Transaction ID", "Screenshot", "Status"]}>
        {pendingPayments.length === 0 ? <Empty colSpan={6} text="No pending payments." /> : pendingPayments.map(payment => (
          <tr key={payment.id} className="hover:bg-white/5">
            <td className="p-4"><div className="font-medium text-white">{payment.user?.name || "Unknown"}</div><div className="text-sm text-gray-400">{payment.user?.phone}</div></td>
            <td className="p-4 text-white font-bold">৳{payment.amount}</td>
            <td className="p-4 text-gray-300 capitalize">{payment.method || "N/A"}</td>
            <td className="p-4 text-orange-300 font-mono">{payment.trxId || "N/A"}</td>
            <td className="p-4 text-gray-400">{payment.screenshotUrl ? "Uploaded" : "Optional/No"}</td>
            <td className="p-4">
              <span className="px-2.5 py-1 text-xs rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                Pending Verification
              </span>
            </td>
          </tr>
        ))}
      </Table>

      <Table title="Due List / Unpaid Bills" headers={["Invoice", "Customer", "Amount", "Due Date", "Status"]}>
        {dueInvoices.length === 0 ? <Empty colSpan={5} text="No due invoices." /> : dueInvoices.map(invoice => (
          <tr key={invoice.id} className="hover:bg-white/5">
            <td className="p-4 text-white font-mono">INV-{invoice.id}</td>
            <td className="p-4 text-gray-300">{invoice.user?.name}</td>
            <td className="p-4 text-white font-bold">৳{invoice.amount}</td>
            <td className="p-4 text-gray-400">{invoice.dueDate?.toLocaleDateString()}</td>
            <td className="p-4 text-red-400 capitalize">{invoice.status}</td>
          </tr>
        ))}
      </Table>

      <Table title="Recent Transaction Log" headers={["Customer", "Amount", "Method", "Trx ID", "Status", "Date"]}>
        {paymentHistory.length === 0 ? <Empty colSpan={6} text="No transactions yet." /> : paymentHistory.map(payment => (
          <tr key={payment.id} className="hover:bg-white/5">
            <td className="p-4 text-white">{payment.user?.name}</td>
            <td className="p-4 text-white font-bold">৳{payment.amount}</td>
            <td className="p-4 text-gray-300 capitalize">{payment.method}</td>
            <td className="p-4 text-gray-300 font-mono">{payment.trxId}</td>
            <td className="p-4 capitalize">
              <span className={
                payment.status === "approved" 
                  ? "text-orange-400 font-semibold" 
                  : payment.status === "rejected" 
                    ? "text-red-400" 
                    : payment.status === "rolled_back" 
                      ? "text-gray-500 italic font-medium" 
                      : "text-yellow-400"
              }>
                {payment.status === "rolled_back" ? "Rolled Back" : payment.status}
              </span>
            </td>
            <td className="p-4 text-gray-400">{payment.createdAt?.toLocaleDateString()}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color: string }) { 
  return <div className="glass-card p-5 flex items-center gap-4"><div className={`p-3 rounded-xl bg-white/10 ${color}`}>{icon}</div><div><p className="text-gray-400 text-sm">{label}</p><p className="text-2xl font-bold text-white">{value}</p></div></div>; 
}

function Table({ title, headers, children }: { title: string; headers: string[]; children: ReactNode }) { 
  return <div className="glass-card overflow-hidden"><div className="p-5 border-b border-white/10 bg-white/5"><h2 className="text-lg font-semibold text-white">{title}</h2></div><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-white/10 text-sm font-semibold text-gray-400 uppercase tracking-wider bg-white/5">{headers.map(h => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{children}</tbody></table></div></div>; 
}

function Empty({ colSpan, text }: { colSpan: number; text: string }) { 
  return <tr><td colSpan={colSpan} className="p-8 text-center text-gray-500">{text}</td></tr>; 
}
