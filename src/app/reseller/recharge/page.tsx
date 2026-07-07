import { db } from "@/db";
import { users, payments, invoices, transactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Wallet, Zap, Clock, CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

async function rechargeCustomer(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || session.role !== "reseller") redirect("/login");

  const customerId = Number(formData.get("customerId"));
  const amount = Number(formData.get("amount"));
  if (!customerId || !amount || amount <= 0) return;

  // Get reseller by session ID (FIXED — no longer hardcoded)
  const reseller = await db.query.users.findFirst({
    where: and(eq(users.id, session.userId), eq(users.role, "reseller")),
  });
  if (!reseller) return;

  const balance = Number(reseller.walletBalance || 0);
  if (balance < amount) return; // Insufficient balance

  const customer = await db.query.users.findFirst({
    where: and(eq(users.id, customerId), eq(users.resellerId, session.userId)),
    with: { package: true },
  });
  if (!customer) return; // Security: ensure customer belongs to this reseller

  // Extend from current expiry if not yet expired
  const durationDays = (customer.package as any)?.durationDays || 30;
  let baseDate = new Date();
  if (customer.expireDate && new Date(customer.expireDate) > baseDate) {
    baseDate = new Date(customer.expireDate);
  }
  const newExpireDate = new Date(baseDate);
  newExpireDate.setDate(newExpireDate.getDate() + durationDays);
  const now = new Date();
  newExpireDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

  // Deduct from reseller wallet
  await db.update(users)
    .set({ walletBalance: String((balance - amount).toFixed(2)) })
    .where(eq(users.id, session.userId));

  // Activate customer
  await db.update(users)
    .set({ status: "active", expireDate: newExpireDate })
    .where(eq(users.id, customerId));

  // Log payment record
  await db.insert(payments).values({
    userId: customerId,
    amount: String(amount),
    method: "reseller_wallet",
    trxId: `RS-${Date.now()}`,
    status: "approved",
  });

  // Log invoice
  await db.insert(invoices).values({
    userId: customerId,
    amount: String(amount),
    status: "paid",
    dueDate: newExpireDate,
  });

  // Log reseller transaction
  await db.insert(transactions).values({
    resellerId: session.userId,
    customerId: customerId,
    amount: String(amount),
    type: "recharge",
  });

  // Sync to MikroTik
  if (customer.pppoeUsername) {
    try {
      const { syncCustomerToMikrotik } = await import("@/lib/sync");
      await syncCustomerToMikrotik(customer.pppoeUsername, undefined, customer.packageId, "active");
    } catch (e) {
      console.error("MikroTik sync error:", e);
    }
  }

  // Send SMS notification (if configured)
  try {
    const { sendSMS } = await import("@/lib/sms");
    const msg = `প্রিয় ${customer.name}, আপনার ইন্টারনেট সংযোগ সফলভাবে রিচার্জ হয়েছে। মেয়াদ: ${newExpireDate.toLocaleDateString("bn-BD")}। ধন্যবাদ।`;
    await sendSMS(customer.phone, msg);
  } catch {
    // SMS failure should not block recharge
  }

  revalidatePath("/reseller/recharge");
  revalidatePath("/reseller/billing");
}

export default async function ResellerRechargePage() {
  const session = await getSession();
  if (!session || session.role !== "reseller") redirect("/login");

  // Session-based reseller fetch (FIXED)
  const reseller = await db.query.users.findFirst({
    where: and(eq(users.id, session.userId), eq(users.role, "reseller")),
  });

  // Only show customers belonging to this reseller
  const customers = await db.query.users.findMany({
    where: and(eq(users.role, "customer"), eq(users.resellerId, session.userId)),
    with: { package: true },
    orderBy: [users.name],
  });

  // Today's recharge count for this reseller
  const todayRecharges = await db.query.payments.findMany({
    where: and(
      eq(payments.method, "reseller_wallet"),
      eq(payments.status, "approved"),
      sql`DATE(${payments.createdAt}) = CURRENT_DATE`
    ),
  });

  const todayTotal = todayRecharges.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = Number(reseller?.walletBalance || 0);

  const expiredCustomers = customers.filter(
    (c) => c.expireDate && new Date(c.expireDate) < new Date()
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white tracking-wide">Quick Customer Recharge</h1>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex flex-col gap-1">
          <span className="text-xs text-gray-400">Wallet Balance</span>
          <span className={`text-2xl font-bold ${balance < 500 ? "text-red-400" : "text-neon-green"}`}>৳{balance.toFixed(2)}</span>
          {balance < 500 && <span className="text-xs text-red-400">Low balance!</span>}
        </div>
        <div className="glass-card p-4 flex flex-col gap-1">
          <span className="text-xs text-gray-400">My Customers</span>
          <span className="text-2xl font-bold text-white">{customers.length}</span>
        </div>
        <div className="glass-card p-4 flex flex-col gap-1">
          <span className="text-xs text-gray-400">Today&apos;s Recharge</span>
          <span className="text-2xl font-bold text-neon-blue">৳{todayTotal.toFixed(2)}</span>
        </div>
        <div className="glass-card p-4 flex flex-col gap-1">
          <span className="text-xs text-gray-400">Expired Customers</span>
          <span className={`text-2xl font-bold ${expiredCustomers.length > 0 ? "text-red-400" : "text-gray-400"}`}>{expiredCustomers.length}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Recharge Form */}
        <form action={rechargeCustomer} className="glass-card p-6 md:p-8 space-y-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="text-neon-green" size={22} /> Recharge Customer
          </h2>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Select Customer</label>
            <select name="customerId" required className="w-full glass-input px-4 py-3 bg-slate-800 text-white">
              <option value="" className="bg-slate-800">— Select customer —</option>
              {customers.map((c) => {
                const isExpired = c.expireDate && new Date(c.expireDate) < new Date();
                return (
                  <option key={c.id} value={c.id} className="bg-slate-800">
                    {isExpired ? "⚠️" : "✅"} {c.name} — {c.phone} — {c.package?.name || "No Pkg"} — ৳{c.package?.price || "0"}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Amount (৳)</label>
            <input
              name="amount"
              type="number"
              required
              min="1"
              placeholder="Recharge amount"
              className="w-full glass-input px-4 py-3 bg-slate-800 text-white"
            />
          </div>

          <button
            type="submit"
            disabled={balance <= 0}
            className="w-full py-3 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/40 font-semibold hover:bg-neon-green/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap size={16} className="inline mr-2" />
            Recharge & Activate Line
          </button>
          <p className="text-xs text-gray-500">
            Amount deducted from your wallet. Customer connection activates immediately.
          </p>
        </form>

        {/* Expired Customers Quick List */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="text-red-400" size={22} /> Expired Customers
          </h2>
          {expiredCustomers.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-500">
              <CheckCircle2 size={32} className="text-neon-green mb-2" />
              <span>সব customer active আছে!</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {expiredCustomers.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div>
                    <p className="text-white font-medium text-sm">{c.name}</p>
                    <p className="text-gray-400 text-xs">{c.phone} · {c.package?.name}</p>
                    <p className="text-red-400 text-xs">
                      Expired: {c.expireDate ? new Date(c.expireDate).toLocaleDateString("en-BD") : "N/A"}
                    </p>
                  </div>
                  <XCircle size={18} className="text-red-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
