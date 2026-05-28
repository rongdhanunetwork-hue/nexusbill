import { db } from "@/db";
import { users, payments, invoices } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Wallet, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

async function rechargeCustomer(formData: FormData) {
  "use server";
  const reseller = await db.query.users.findFirst({ where: eq(users.role, "reseller") });
  const customerId = Number(formData.get("customerId"));
  const amount = Number(formData.get("amount"));
  if (!reseller || !customerId || !amount) return;
  const balance = Number(reseller.walletBalance || 0);
  if (balance < amount) return;

  const customer = await db.query.users.findFirst({
    where: eq(users.id, customerId),
    with: { package: true },
  });
  if (!customer) return;

  // Use package durationDays, extend from current expiry if not yet expired
  const durationDays = (customer.package as any)?.durationDays || 30;
  let baseDate = new Date();
  if (customer.expireDate && new Date(customer.expireDate) > baseDate) {
    baseDate = new Date(customer.expireDate);
  }
  const newExpireDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  await db.update(users).set({ walletBalance: String(balance - amount) }).where(eq(users.id, reseller.id));
  await db.update(users).set({ status: "active", expireDate: newExpireDate }).where(eq(users.id, customerId));
  await db.insert(payments).values({ userId: customerId, amount: String(amount), method: "reseller_wallet", trxId: `RS-${Date.now()}`, status: "approved" });
  // Insert paid invoice for billing history
  await db.insert(invoices).values({ userId: customerId, amount: String(amount), status: "paid", dueDate: newExpireDate });

  if (customer && customer.pppoeUsername) {
    const { syncCustomerToMikrotik } = await import("@/lib/sync");
    await syncCustomerToMikrotik(
      customer.pppoeUsername,
      undefined, // password stays same
      customer.packageId,
      "active"
    );
  }

  revalidatePath("/reseller/recharge");
}

export default async function ResellerRechargePage() {
  const reseller = await db.query.users.findFirst({ where: eq(users.role, "reseller") });
  const customers = await db.query.users.findMany({ where: sql`${users.role}='customer' and ${users.resellerId}=${reseller?.id || 0}`, with: { package: true } });
  return (
    <div className="max-w-3xl space-y-8">
      <div className="glass-card p-6 flex items-center justify-between">
        <div>
          <p className="text-gray-400">Wallet Balance</p>
          <p className="text-4xl font-bold text-white">৳{reseller?.walletBalance || "0.00"}</p>
        </div>
        <Wallet className="text-purple-300" size={42}/>
      </div>

      {/* bKash Online Pay Link Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#E2136E]/25 via-[#E2136E]/5 to-transparent border border-[#E2136E]/30 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 z-10">
          <h3 className="text-[#FF4C9C] font-bold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E2136E] animate-ping" />
            bKash Online Pay (বিকাশ অনলাইন পেমেন্ট)
          </h3>
          <p className="text-xs text-gray-300">
            রিসেলার ওয়ালেট রিচার্জ বা কাস্টমার পেমেন্টের জন্য সরাসরি বিকাশ অনলাইন পেমেন্ট গেটওয়ে ব্যবহার করুন।
          </p>
        </div>
        <a
          href="https://shop.bkash.com/rdn-internet-service-provider0/paymentlink/default-payment"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#E2136E] hover:bg-[#b00f55] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg hover:shadow-[#E2136E]/30 hover:scale-105 active:scale-95 transition-all shrink-0 z-10 text-center w-full sm:w-auto"
        >
          অনলাইন পেমেন্ট করুন
        </a>
      </div>

      <form action={rechargeCustomer} className="glass-card p-6 md:p-8 space-y-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="text-neon-green"/> Recharge Customer
        </h1>
        <select name="customerId" required className="w-full glass-input px-4 py-3 bg-slate-800">
          <option value="" className="bg-slate-800">Select customer</option>
          {customers.map(c => (
            <option key={c.id} value={c.id} className="bg-slate-800">
              {c.name} - {c.phone} - {c.package?.name || "No Package"}
            </option>
          ))}
        </select>
        <input name="amount" type="number" required placeholder="Recharge Amount" className="w-full glass-input px-4 py-3 bg-slate-800"/>
        <button className="w-full py-3 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/40 font-semibold">
          Recharge & Activate Line
        </button>
        <p className="text-xs text-gray-500">
          Amount will be deducted from reseller wallet and customer expire date will extend 30 days.
        </p>
      </form>
    </div>
  );
}
