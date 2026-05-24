import { db } from "@/db";
import { users, payments } from "@/db/schema";
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
  await db.update(users).set({ walletBalance: String(balance - amount) }).where(eq(users.id, reseller.id));
  await db.update(users).set({ status: "active", expireDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }).where(eq(users.id, customerId));
  await db.insert(payments).values({ userId: customerId, amount: String(amount), method: "reseller_wallet", trxId: `RS-${Date.now()}`, status: "approved" });
  revalidatePath("/reseller/recharge");
}

export default async function ResellerRechargePage() {
  const reseller = await db.query.users.findFirst({ where: eq(users.role, "reseller") });
  const customers = await db.query.users.findMany({ where: sql`${users.role}='customer' and ${users.resellerId}=${reseller?.id || 0}`, with: { package: true } });
  return <div className="max-w-3xl space-y-8"><div className="glass-card p-6 flex items-center justify-between"><div><p className="text-gray-400">Wallet Balance</p><p className="text-4xl font-bold text-white">৳{reseller?.walletBalance || "0.00"}</p></div><Wallet className="text-purple-300" size={42}/></div><form action={rechargeCustomer} className="glass-card p-6 md:p-8 space-y-5"><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Zap className="text-neon-green"/> Recharge Customer</h1><select name="customerId" required className="w-full glass-input px-4 py-3 bg-slate-800"><option value="" className="bg-slate-800">Select customer</option>{customers.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.name} - {c.phone} - {c.package?.name || "No Package"}</option>)}</select><input name="amount" type="number" required placeholder="Recharge Amount" className="w-full glass-input px-4 py-3 bg-slate-800"/><button className="w-full py-3 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/40 font-semibold">Recharge & Activate Line</button><p className="text-xs text-gray-500">Amount will be deducted from reseller wallet and customer expire date will extend 30 days.</p></form></div>;
}
