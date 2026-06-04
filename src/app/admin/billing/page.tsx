import { db } from "@/db";
import { payments, users, invoices, packages, transactions } from "@/db/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { CheckCircle, Clock, DollarSign, FileText, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import RollbackButton from "./RollbackButton";
import PaymentHistoryTable from "./PaymentHistoryTable";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function approvePayment(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) return;

  const paymentId = Number(formData.get("paymentId"));
  const userId = Number(formData.get("userId"));
  const amount = String(formData.get("amount") || "0");
  if (!paymentId || !userId) return;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { package: true },
  });
  if (!user || user.adminId !== session.userId) return;

  const payment = await db.query.payments.findFirst({
    where: and(eq(payments.id, paymentId), eq(payments.userId, userId))
  });
  if (!payment) return;

  // Mark payment as approved
  await db.update(payments).set({ status: "approved" }).where(eq(payments.id, paymentId));

  // Check if this is a RESELLER credit request
  if (user.role === "reseller") {
    // Add wallet credit to the reseller
    const curBal = Number(user.walletBalance || 0);
    const newBal = (curBal + Number(amount)).toFixed(2);
    await db.update(users)
      .set({ walletBalance: String(newBal) })
      .where(eq(users.id, userId));

    // Log transaction as credit_in
    await db.insert(transactions).values({
      resellerId: userId,
      amount: String(amount),
      type: "credit_in",
    });

    // SMS to reseller
    try {
      const { sendSMS, smsTemplates } = await import("@/lib/sms");
      await sendSMS(user.phone, smsTemplates.resellerCreditAdded(user.name, amount, newBal));
    } catch { /* non-blocking */ }

  } else {
    // Regular customer payment - extend expiry and activate
    const durationDays = (user.package as any)?.durationDays || 30;

    let baseDate = new Date();
    if (user.expireDate && new Date(user.expireDate) > baseDate) {
      baseDate = new Date(user.expireDate);
    }
    const newExpireDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await db.update(users).set({ status: "active", expireDate: newExpireDate }).where(eq(users.id, userId));
    await db.insert(invoices).values({ userId, amount, status: "paid", dueDate: newExpireDate });

    if (user.pppoeUsername) {
      const { syncCustomerToMikrotik } = await import("@/lib/sync");
      await syncCustomerToMikrotik(user.pppoeUsername, undefined, user.packageId, "active", user.mikrotikId);
    }

    // SMS to customer
    try {
      const { sendSMS, smsTemplates } = await import("@/lib/sms");
      const expStr = newExpireDate.toLocaleDateString("en-BD");
      await sendSMS(user.phone, smsTemplates.paymentApproved(user.name, amount, expStr));
    } catch { /* non-blocking */ }
  }

  revalidatePath("/admin/billing");
}

async function rejectPayment(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) return;

  const paymentId = Number(formData.get("paymentId"));
  if (paymentId) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
      with: { user: true }
    });
    if (!payment || payment.user?.adminId !== session.userId) return;

    await db.update(payments).set({ status: "rejected" }).where(eq(payments.id, paymentId));
  }
  revalidatePath("/admin/billing");
}

async function rollbackPayment(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) return;

  const paymentId = Number(formData.get("paymentId"));
  if (!paymentId) return;

  try {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });
    if (!payment || payment.status !== "approved") return;

    const customer = await db.query.users.findFirst({
      where: eq(users.id, payment.userId),
    });
    if (!customer || customer.adminId !== session.userId) return;

    let durationDays = 30;
    if (customer.packageId) {
      const pkg = await db.query.packages.findFirst({
        where: eq(packages.id, customer.packageId)
      });
      if (pkg && pkg.durationDays) {
        durationDays = pkg.durationDays;
      }
    }

    const currentExpire = customer.expireDate ? new Date(customer.expireDate) : new Date();
    const newExpire = new Date(currentExpire.getTime() - durationDays * 24 * 60 * 60 * 1000);
    
    const now = new Date();
    const isExpired = newExpire <= now;
    const newStatus = isExpired ? "expired" : "active";

    // Revert user expiry and status in DB
    await db.update(users)
      .set({
        expireDate: newExpire,
        status: newStatus
      })
      .where(eq(users.id, customer.id));

    // Mark payment rolled_back
    await db.update(payments)
      .set({ status: "rolled_back" })
      .where(eq(payments.id, paymentId));

    // If the payment was made using a reseller wallet, refund the reseller balance
    if (payment.method === "reseller_wallet" && customer.resellerId) {
      const reseller = await db.query.users.findFirst({
        where: eq(users.id, customer.resellerId),
      });
      if (reseller) {
        const curBal = Number(reseller.walletBalance || 0);
        const refAmt = Number(payment.amount);
        await db.update(users)
          .set({ walletBalance: String((curBal + refAmt).toFixed(2)) })
          .where(eq(users.id, reseller.id));
        
        // Log transaction type: refund
        await db.insert(transactions).values({
          resellerId: reseller.id,
          customerId: customer.id,
          amount: payment.amount,
          type: "refund",
        });
      }
    }

    // Delete matching invoice if one exists
    const matchInvoice = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.userId, customer.id),
        eq(invoices.amount, payment.amount),
        eq(invoices.status, "paid")
      ),
      orderBy: [desc(invoices.createdAt)],
    });

    if (matchInvoice) {
      await db.delete(invoices).where(eq(invoices.id, matchInvoice.id));
    }

    // Sync to MikroTik router
    if (customer.pppoeUsername) {
      const { syncCustomerToMikrotik } = await import("@/lib/sync");
      await syncCustomerToMikrotik(
        customer.pppoeUsername,
        undefined,
        customer.packageId,
        newStatus,
        customer.mikrotikId
      );
    }
  } catch (err) {
    console.error("Rollback payment error:", err);
  }

  revalidatePath("/admin/billing");
}

async function addResellerCredit(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) return;

  const resellerId = Number(formData.get("resellerId"));
  const amount = Number(formData.get("amount"));
  if (!resellerId || !amount) return;

  const reseller = await db.query.users.findFirst({
    where: and(eq(users.id, resellerId), eq(users.role, "reseller")),
  });
  if (!reseller || reseller.adminId !== session.userId) return;

  const currentBalance = Number(reseller.walletBalance || 0);
  await db.update(users)
    .set({ walletBalance: String((currentBalance + amount).toFixed(2)) })
    .where(eq(users.id, resellerId));

  // Record transaction
  await db.insert(transactions).values({
    resellerId: resellerId,
    amount: String(amount),
    type: "credit_in",
  });

  revalidatePath("/admin/billing");
}

async function generateMonthlyBills() {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) return;

  const customers = await db.query.users.findMany({ 
    where: and(eq(users.role, "customer"), eq(users.adminId, session.userId)), 
    with: { package: true } 
  });
  for (const customer of customers) {
    if (customer.package?.price) {
      await db.insert(invoices).values({ userId: customer.id, amount: customer.package.price, status: "unpaid", dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    }
  }
  revalidatePath("/admin/billing");
}

export default async function BillingPage() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    redirect("/login/admin");
  }

  // Get all user IDs (customers and resellers) belonging to this admin
  const adminUsers = await db.select({ id: users.id }).from(users).where(eq(users.adminId, session.userId));
  const adminUserIds = adminUsers.map(u => u.id);
  const userFilter = inArray(payments.userId, adminUserIds.length > 0 ? adminUserIds : [-1]);
  const invoiceUserFilter = inArray(invoices.userId, adminUserIds.length > 0 ? adminUserIds : [-1]);

  const pendingPayments = await db.query.payments.findMany({ 
    where: and(eq(payments.status, "pending"), userFilter), 
    orderBy: [desc(payments.createdAt)], 
    with: { user: true } 
  });
  
  const paymentHistory = await db.query.payments.findMany({ 
    where: userFilter,
    orderBy: [desc(payments.createdAt)], 
    limit: 200, 
    with: { user: true } 
  });

  const dueInvoices = await db.query.invoices.findMany({ 
    where: and(sql`${invoices.status} in ('unpaid','due')`, invoiceUserFilter), 
    orderBy: [desc(invoices.createdAt)], 
    with: { user: true } 
  });

  const [dueTotal] = await db.select({ sum: sql<number>`cast(coalesce(sum(${invoices.amount}),0) as int)` })
    .from(invoices)
    .where(and(sql`${invoices.status} in ('unpaid','due')`, invoiceUserFilter));

  const resellersList = await db.query.users.findMany({
    where: and(eq(users.role, "reseller"), eq(users.adminId, session.userId)),
    orderBy: [desc(users.id)],
  });

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

      {/* Reseller Credit Addition Form & Wallets Summary */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Reseller Credit Form */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Add Reseller Credit</h2>
          <form action={addResellerCredit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Select Reseller</label>
              <select name="resellerId" required className="w-full glass-input px-4 py-3 bg-slate-800">
                <option value="" className="bg-slate-800">Select reseller account</option>
                {resellersList.map(r => (
                  <option key={r.id} value={r.id} className="bg-slate-800">
                    {r.name} - {r.phone} (৳{r.walletBalance || "0.00"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Credit Amount (৳)</label>
              <input name="amount" type="number" required min="1" placeholder="Amount to add" className="w-full glass-input px-4 py-3 bg-slate-800" />
            </div>
            <button className="w-full py-3 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/40 font-semibold hover:bg-neon-green/30">
              Add Credit & Log Transaction
            </button>
          </form>
        </div>

        {/* Right: Reseller Wallet Summary Table */}
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
                    <td className="p-4 text-neon-green font-bold">৳{r.walletBalance || "0.00"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Table title="Pending Payment - Transaction ID Verify" headers={["Customer", "Amount", "Method", "Transaction ID", "Screenshot", "Actions"]}>
        {pendingPayments.length === 0 ? <Empty colSpan={6} text="No pending payments." /> : pendingPayments.map(payment => (
          <tr key={payment.id} className="hover:bg-white/5">
            <td className="p-4"><div className="font-medium text-white">{payment.user?.name || "Unknown"}{payment.user?.role === "reseller" && <span className="ml-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">Reseller Credit</span>}</div><div className="text-sm text-gray-400">{payment.user?.phone}</div></td>
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

      <PaymentHistoryTable
        payments={paymentHistory.map(p => ({
          ...p,
          createdAt: p.createdAt ?? null,
        }))}
        rollbackAction={rollbackPayment}
      />
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color: string }) { return <div className="glass-card p-5 flex items-center gap-4"><div className={`p-3 rounded-xl bg-white/10 ${color}`}>{icon}</div><div><p className="text-gray-400 text-sm">{label}</p><p className="text-2xl font-bold text-white">{value}</p></div></div>; }
function Table({ title, headers, children }: { title: string; headers: string[]; children: ReactNode }) { return <div className="glass-card overflow-hidden"><div className="p-5 border-b border-white/10 bg-white/5"><h2 className="text-lg font-semibold text-white">{title}</h2></div><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-white/10 text-sm font-semibold text-gray-400 uppercase tracking-wider bg-white/5">{headers.map(h => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{children}</tbody></table></div></div>; }
function Empty({ colSpan, text }: { colSpan: number; text: string }) { return <tr><td colSpan={colSpan} className="p-8 text-center text-gray-500">{text}</td></tr>; }
