import { db } from "@/db";
import { users, payments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Banknote } from "lucide-react";
export const dynamic = "force-dynamic";
async function receiveBill(formData: FormData) { 
  "use server"; 
  const userId = Number(formData.get("userId")); 
  const amount = String(formData.get("amount") || "0"); 
  if (!userId) return; 

  const customer = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  await db.insert(payments).values({ userId, amount, method: "employee_cash", trxId: `EMP-${Date.now()}`, status: "approved" }); 
  await db.update(users).set({ status: "active", expireDate: new Date(Date.now() + 30*24*60*60*1000) }).where(eq(users.id, userId)); 

  if (customer && customer.pppoeUsername) {
    const { syncCustomerToMikrotik } = await import("@/lib/sync");
    await syncCustomerToMikrotik(
      customer.pppoeUsername,
      undefined, // password stays same
      customer.packageId,
      "active"
    );
  }

  revalidatePath("/employee/collection"); 
}
export default async function EmployeeCollectionPage() {
  const customers = await db.query.users.findMany({ where: eq(users.role, "customer"), with: { package: true } });
  const recent = await db.query.payments.findMany({ orderBy: [desc(payments.createdAt)], limit: 10, with: { user: true } });
  return <div className="grid lg:grid-cols-2 gap-8"><form action={receiveBill} className="glass-card p-6 space-y-5"><h1 className="text-2xl font-bold text-white flex gap-2"><Banknote className="text-neon-green"/> Receive Customer Bill</h1><select name="userId" required className="w-full glass-input px-4 py-3 bg-slate-800"><option value="" className="bg-slate-800">Select customer</option>{customers.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.name} - {c.phone} - {c.package?.name || "No Package"}</option>)}</select><input name="amount" type="number" required placeholder="Amount received" className="w-full glass-input px-4 py-3 bg-slate-800"/><button className="w-full py-3 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/40 font-semibold">Receive & Activate Line</button><p className="text-xs text-gray-500">This does not expose total company income; it only records staff collection.</p></form><div className="glass-card overflow-hidden"><div className="p-5 border-b border-white/10 bg-white/5"><h2 className="text-white font-semibold">Recent Staff Collections</h2></div><div className="divide-y divide-white/5">{recent.length === 0 ? <div className="p-8 text-center text-gray-500">No collection yet.</div> : recent.map(p => <div key={p.id} className="p-4 flex justify-between"><div><p className="text-white">{p.user?.name}</p><p className="text-gray-400 text-sm">{p.method}</p></div><p className="text-neon-green font-bold">৳{p.amount}</p></div>)}</div></div></div>;
}
