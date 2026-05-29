import { db } from "@/db";
import { payments, users, invoices, packages, transactions } from "@/db/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { CheckCircle, Clock, Wallet, Zap, FileText, PlusCircle, ArrowDownCircle } from "lucide-react";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function isToday(dateInput: string | Date | null | undefined): boolean {
  if (!dateInput) return false;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

async function requestWalletCredit(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || session.role !== "reseller") return;

  const amount = String(formData.get("amount") || "0");
  const method = String(formData.get("method") || "bkash");
  const trxId = String(formData.get("trxId") || "").trim();

  if (!amount || Number(amount) <= 0 || !trxId) return;

  // Insert payment record linked to the reseller themselves (userId = resellerId)
  await db.insert(payments).values({
    userId: session.userId,
    amount,
    method,
    trxId,
    status: "pending",
  });

  revalidatePath("/reseller/billing");
}

async function rollbackPayment(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || session.role !== "reseller") return;

  const paymentId = Number(formData.get("paymentId"));
  if (!paymentId) return;

  try {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });
    if (!payment || payment.status !== "approved" || payment.method !== "reseller_wallet") return;

    // Verify same-day restriction
    if (!isToday(payment.createdAt)) {
      console.error("Rollback rejected: Not same-day transaction.");
      return;
    }

    const customer = await db.query.users.findFirst({
      where: eq(users.id, payment.userId),
    });
    if (!customer || customer.resellerId !== session.userId) return;

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

    // Revert customer in DB
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

    // Refund reseller balance
    const reseller = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });
    if (reseller) {
      const curBal = Number(reseller.walletBalance || 0);
      const refAmt = Number(payment.amount);
      await db.update(users)
        .set({ walletBalance: String((curBal + refAmt).toFixed(2)) })
        .where(eq(users.id, reseller.id));
      
      // Log transaction: refund
      await db.insert(transactions).values({
        resellerId: reseller.id,
        customerId: customer.id,
        amount: payment.amount,
        type: "refund",
      });
    }

    // Delete matching invoice
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
        newStatus
      );
    }
  } catch (err) {
    console.error("Reseller rollback payment error:", err);
  }

  revalidatePath("/reseller/billing");
}

async function rechargeCustomer(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || session.role !== "reseller") return;

  const reseller = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  const customerId = Number(formData.get("customerId"));
  const amount = Number(formData.get("amount"));
  if (!reseller || !customerId || !amount) return;

  const balance = Number(reseller.walletBalance || 0);
  if (balance < amount) return;

  const customer = await db.query.users.findFirst({
    where: and(eq(users.id, customerId), eq(users.resellerId, reseller.id)),
    with: { package: true },
  });
  if (!customer) return;

  const durationDays = (customer.package as any)?.durationDays || 30;
  let baseDate = new Date();
  if (customer.expireDate && new Date(customer.expireDate) > baseDate) {
    baseDate = new Date(customer.expireDate);
  }
  const newExpireDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Deduct balance & activate customer
  await db.update(users).set({ walletBalance: String((balance - amount).toFixed(2)) }).where(eq(users.id, reseller.id));
  await db.update(users).set({ status: "active", expireDate: newExpireDate }).where(eq(users.id, customerId));
  
  // Record payment
  await db.insert(payments).values({
    userId: customerId,
    amount: String(amount),
    method: "reseller_wallet",
    trxId: `RS-${Date.now().toString().slice(-6)}`,
    status: "approved"
  });

  // Record invoice
  await db.insert(invoices).values({
    userId: customerId,
    amount: String(amount),
    status: "paid",
    dueDate: newExpireDate
  });

  // Log transaction
  await db.insert(transactions).values({
    resellerId: reseller.id,
    customerId: customer.id,
    amount: String(amount),
    type: "recharge",
  });

  if (customer.pppoeUsername) {
    const { syncCustomerToMikrotik } = await import("@/lib/sync");
    await syncCustomerToMikrotik(
      customer.pppoeUsername,
      undefined,
      customer.packageId,
      "active"
    );
  }

  revalidatePath("/reseller/billing");
}

export default async function ResellerBillingPage() {
  const session = await getSession();
  if (!session || session.role !== "reseller") {
    redirect("/login/reseller");
  }

  const reseller = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  const customers = await db.query.users.findMany({
    where: and(eq(users.role, "customer"), eq(users.resellerId, session.userId)),
    with: { package: true }
  });

  const customerIds = customers.map(c => c.id);

  // Wallet Logs (Transactions)
  const walletLogs = await db.query.transactions.findMany({
    where: eq(transactions.resellerId, session.userId),
    orderBy: [desc(transactions.createdAt)],
    with: { customer: true }
  });

  // Recharges history (payments to customers)
  let rechargeHistory: any[] = [];
  if (customerIds.length > 0) {
    rechargeHistory = await db.query.payments.findMany({
      where: and(inArray(payments.userId, customerIds), eq(payments.method, "reseller_wallet")),
      orderBy: [desc(payments.createdAt)],
      limit: 20,
      with: { user: true }
    });
  }

  // Credit Request History (payments where the reseller is the userId, i.e. their own top-up requests)
  const creditRequests = await db.query.payments.findMany({
    where: and(
      eq(payments.userId, session.userId),
      sql`${payments.method} != 'reseller_wallet'`
    ),
    orderBy: [desc(payments.createdAt)],
    limit: 20,
  });

  const pendingCredits = creditRequests.filter(p => p.status === "pending").length;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white tracking-wide">Wallet Billing & Recharges</h1>
      </div>

      {/* Top cards: Wallet balance + Credit Request + Recharge */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Wallet Balance Card */}
        <div className="glass-card p-6 flex items-center justify-between md:col-span-1">
          <div>
            <p className="text-gray-400 text-sm">Reseller Wallet Balance</p>
            <p className="text-4xl font-bold text-purple-300">৳{reseller?.walletBalance || "0.00"}</p>
            {pendingCredits > 0 && (
              <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                <Clock size={12} /> {pendingCredits} credit request{pendingCredits > 1 ? "s" : ""} pending
              </p>
            )}
          </div>
          <Wallet className="text-purple-400 animate-pulse shrink-0" size={48} />
        </div>

        {/* Request Wallet Credit Form */}
        <form action={requestWalletCredit} className="glass-card p-6 space-y-4 md:col-span-2">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ArrowDownCircle className="text-emerald-400" size={20} /> Request Wallet Credit (Top-Up)
          </h2>
          <p className="text-xs text-gray-400">
            Send your payment via bKash/Nagad and enter the Transaction ID here. Admin will verify and credit your wallet.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Payment Method</label>
              <select name="method" required className="w-full glass-input px-4 py-3 bg-slate-800 text-white">
                <option value="bkash" className="bg-slate-800">bKash</option>
                <option value="nagad" className="bg-slate-800">Nagad</option>
                <option value="rocket" className="bg-slate-800">Rocket</option>
                <option value="bank_transfer" className="bg-slate-800">Bank Transfer</option>
                <option value="cash" className="bg-slate-800">Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Amount (৳)</label>
              <input name="amount" type="number" required min="1" placeholder="e.g. 5000" className="w-full glass-input px-4 py-3 bg-slate-800 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Transaction ID</label>
              <input name="trxId" type="text" required placeholder="e.g. BK123456789" className="w-full glass-input px-4 py-3 bg-slate-800 text-white" />
            </div>
          </div>
          <button className="w-full py-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-semibold hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-2">
            <PlusCircle size={18} /> Submit Credit Request
          </button>
        </form>
      </div>

      {/* Credit Request History */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-white/10 bg-white/5 flex items-center gap-2">
          <ArrowDownCircle className="text-emerald-400" size={18} />
          <h2 className="text-lg font-semibold text-white">My Credit Requests (Top-Up History)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs font-semibold text-gray-400 uppercase bg-white/5">
                <th className="p-4">Method</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {creditRequests.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No credit requests submitted yet.</td></tr>
              ) : creditRequests.map(req => (
                <tr key={req.id} className="hover:bg-white/5">
                  <td className="p-4 text-white capitalize">{req.method?.replace("_", " ")}</td>
                  <td className="p-4 font-bold text-white">৳{req.amount}</td>
                  <td className="p-4 text-gray-300 font-mono text-sm">{req.trxId}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      req.status === "approved"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : req.status === "rejected"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    }`}>
                      {req.status === "approved" ? "Approved ✓" : req.status === "rejected" ? "Rejected ✗" : "Pending…"}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-gray-400">{req.createdAt?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Quick Recharge Form */}
        <form action={rechargeCustomer} className="glass-card p-6 md:p-8 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="text-purple-400" size={20} /> Quick Customer Recharge
          </h2>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Select Customer</label>
            <select name="customerId" required className="w-full glass-input px-4 py-3 bg-slate-800 text-white">
              <option value="" className="bg-slate-800">Choose customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-800">
                  {c.name} - {c.phone} ({c.package?.name || "No Package"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Recharge Amount (৳)</label>
            <input name="amount" type="number" required placeholder="Amount in BDT" className="w-full glass-input px-4 py-3 bg-slate-800 text-white" />
          </div>
          <button className="w-full py-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/40 font-semibold hover:bg-purple-500/30 transition-all">
            Recharge & Extend Line
          </button>
          <p className="text-xs text-gray-500">
            Amount will be deducted from your reseller wallet. Customer line will activate immediately for package duration days.
          </p>
        </form>

        {/* Right: Wallet Transaction Logs */}
        <div className="glass-card overflow-hidden flex flex-col max-h-[500px]">
          <div className="p-5 border-b border-white/10 bg-white/5 flex items-center gap-2">
            <FileText className="text-purple-400" size={18} />
            <h2 className="text-lg font-semibold text-white">Wallet History (Logs)</h2>
          </div>
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold text-gray-400 uppercase bg-white/5">
                  <th className="p-4">Type</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {walletLogs.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">No logs recorded.</td></tr>
                ) : walletLogs.map(log => (
                  <tr key={log.id} className="hover:bg-white/5">
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.type === "credit_in" 
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : log.type === "refund"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      }`}>
                        {log.type === "credit_in" ? "Credited" : log.type === "refund" ? "Refunded" : "Recharged"}
                      </span>
                    </td>
                    <td className="p-4 text-white text-sm">
                      {log.customer?.name || "Self (Admin)"}
                    </td>
                    <td className="p-4 font-bold text-white">৳{log.amount}</td>
                    <td className="p-4 text-xs text-gray-400">{log.createdAt?.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Customer Recharge History with Rollback */}
      <Table title="Customer Recharge History (Rollback Same-Day Only)" headers={["Customer", "Amount", "Trx ID", "Status", "Date", "Action"]}>
        {rechargeHistory.length === 0 ? <Empty colSpan={6} text="No recharge payments made." /> : rechargeHistory.map(payment => {
          const refundable = payment.status === "approved" && isToday(payment.createdAt);
          return (
            <tr key={payment.id} className="hover:bg-white/5">
              <td className="p-4 text-white">
                <div className="font-bold">{payment.user?.name}</div>
                <div className="text-xs text-gray-400">{payment.user?.phone}</div>
              </td>
              <td className="p-4 text-white font-bold">৳{payment.amount}</td>
              <td className="p-4 text-gray-300 font-mono text-sm">{payment.trxId}</td>
              <td className="p-4 capitalize">
                <span className={
                  payment.status === "approved" 
                    ? "text-purple-300 font-semibold" 
                    : payment.status === "rolled_back" 
                      ? "text-gray-400 italic font-medium" 
                      : "text-red-400"
                }>
                  {payment.status === "rolled_back" ? "Rolled Back" : payment.status}
                </span>
              </td>
              <td className="p-4 text-gray-450 text-xs">{payment.createdAt?.toLocaleString()}</td>
              <td className="p-4">
                {refundable ? (
                  <form action={rollbackPayment}>
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <button 
                      type="submit" 
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-all"
                    >
                      Rollback Refund
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-gray-500 italic">Non-refundable</span>
                )}
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

function Table({ title, headers, children }: { title: string; headers: string[]; children: ReactNode }) { return <div className="glass-card overflow-hidden"><div className="p-5 border-b border-white/10 bg-white/5"><h2 className="text-lg font-semibold text-white">{title}</h2></div><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-white/10 text-sm font-semibold text-gray-400 uppercase tracking-wider bg-white/5">{headers.map(h => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{children}</tbody></table></div></div>; }
  function Empty({ colSpan, text }: { colSpan: number; text: string }) { return <tr><td colSpan={colSpan} className="p-8 text-center text-gray-500">{text}</td></tr>; }
