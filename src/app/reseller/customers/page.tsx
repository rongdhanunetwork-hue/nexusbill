import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { UserPlus, Users } from "lucide-react";

export const dynamic = "force-dynamic";

async function addCustomer(formData: FormData) {
  "use server";
  const reseller = await db.query.users.findFirst({ where: eq(users.role, "reseller") });
  const pppoeUsername = String(formData.get("pppoeUsername") || "").trim();
  const packageId = Number(formData.get("packageId")) || null;

  await db.insert(users).values({
    role: "customer",
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    password: "123456",
    address: String(formData.get("address") || ""),
    pppoeUsername: pppoeUsername || null,
    macAddress: String(formData.get("macAddress") || ""),
    packageId,
    resellerId: reseller?.id || null,
    status: "expired",
    expireDate: null
  });

  if (pppoeUsername) {
    const { syncCustomerToMikrotik } = await import("@/lib/sync");
    await syncCustomerToMikrotik(pppoeUsername, "123456", packageId, "expired");
  }

  revalidatePath("/reseller/customers");
}

export default async function ResellerCustomersPage() {
  const reseller = await db.query.users.findFirst({ where: eq(users.role, "reseller") });
  const resellerId = reseller?.id || 0;
  const packages = await db.query.packages.findMany();
  const customers = await db.query.users.findMany({ where: sql`${users.role}='customer' and ${users.resellerId}=${resellerId}`, orderBy: [desc(users.createdAt)], with: { package: true } });
  return <div className="grid xl:grid-cols-3 gap-8"><div className="xl:col-span-1 space-y-6"><h1 className="text-2xl font-bold text-white">Reseller Customers</h1><form action={addCustomer} className="glass-card p-6 space-y-4"><h2 className="font-semibold text-white flex gap-2"><UserPlus size={18}/> Create New User</h2><input name="name" required placeholder="Customer Name" className="w-full glass-input px-4 py-3 bg-slate-800"/><input name="phone" required placeholder="Phone/User ID" className="w-full glass-input px-4 py-3 bg-slate-800"/><input name="address" placeholder="Address" className="w-full glass-input px-4 py-3 bg-slate-800"/><input name="pppoeUsername" required placeholder="PPPoE Username" className="w-full glass-input px-4 py-3 bg-slate-800"/><input name="macAddress" placeholder="MAC Address" className="w-full glass-input px-4 py-3 bg-slate-800"/><select name="packageId" required className="w-full glass-input px-4 py-3 bg-slate-800"><option value="" className="bg-slate-800">Admin assigned package</option>{packages.map(p => <option key={p.id} value={p.id} className="bg-slate-800">{p.name} - {p.speed} - ৳{p.price}</option>)}</select><button className="w-full py-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/40 font-semibold">Save Customer</button></form></div><div className="xl:col-span-2 glass-card overflow-hidden"><div className="p-5 border-b border-white/10 bg-white/5 flex gap-2"><Users size={18} className="text-purple-300"/><h2 className="text-white font-semibold">My Customer List</h2></div><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-white/10 text-sm text-gray-400 uppercase"><th className="p-4">Name</th><th className="p-4">Phone</th><th className="p-4">Package</th><th className="p-4">MAC</th><th className="p-4">Status</th></tr></thead><tbody className="divide-y divide-white/5">{customers.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-500">No reseller customers yet.</td></tr> : customers.map(c => <tr key={c.id}><td className="p-4 text-white">{c.name}</td><td className="p-4 text-gray-300">{c.phone}</td><td className="p-4 text-gray-300">{c.package?.name || "No Package"}</td><td className="p-4 text-gray-400 font-mono">{c.macAddress || "N/A"}</td><td className="p-4 text-gray-300">{c.status}</td></tr>)}</tbody></table></div></div></div>;
}
