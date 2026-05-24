import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Plus, Search, Edit, Trash, Wifi, WifiOff, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

async function deleteCustomer(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  if (id) await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin/customers");
}

export default async function CustomersPage() {
  const allCustomers = await db.query.users.findMany({
    where: eq(users.role, "customer"),
    orderBy: [desc(users.createdAt)],
    with: { package: true, mikrotik: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white tracking-wide">Customer Management</h1>
        <Link href="/admin/customers/new" className="bg-neon-blue/20 text-neon-blue border border-neon-blue/50 px-5 py-2.5 rounded-xl font-semibold hover:bg-neon-blue/30 flex items-center gap-2 transition-colors">
          <Plus size={20} /> Add Customer
        </Link>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Search by name, phone or PPPoE..." className="w-full pl-12 pr-4 py-2.5 glass-input bg-slate-800" />
          </div>
          <select className="glass-input px-4 py-2.5 bg-slate-800 w-full sm:w-auto">
            <option className="bg-slate-800">All Status</option>
            <option className="bg-slate-800">Active</option>
            <option className="bg-slate-800">Online</option>
            <option className="bg-slate-800">Offline</option>
            <option className="bg-slate-800">Expired</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-sm font-semibold text-gray-400 uppercase tracking-wider bg-white/5">
                <th className="p-5">Customer Info</th>
                <th className="p-5">Photo/NID</th>
                <th className="p-5">Connection</th>
                <th className="p-5">Status</th>
                <th className="p-5">Expire Date</th>
                <th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allCustomers.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-gray-500"><WifiOff size={40} className="mx-auto mb-3 text-gray-600" />No customers found.</td></tr>
              ) : allCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-5">
                    <Link href={`/admin/customers/${customer.id}`} className="font-bold text-white hover:text-neon-blue text-base">{customer.name}</Link>
                    <div className="text-sm text-gray-400">{customer.phone}</div>
                    <div className="text-xs text-gray-500 max-w-48 truncate">{customer.address || "No address"}</div>
                  </td>
                  <td className="p-5 text-sm">
                    <div className="text-gray-300">Photo: {customer.photoUrl ? "Uploaded" : "No"}</div>
                    <div className="text-gray-400">NID: {customer.nidUrl ? "Uploaded" : "No"}</div>
                  </td>
                  <td className="p-5">
                    <div className="text-gray-300 font-medium">{customer.pppoeUsername || "N/A"}</div>
                    <div className="text-xs text-neon-blue mt-1">{customer.package?.name || "No Plan"}</div>
                  </td>
                  <td className="p-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${customer.status === "active" || customer.status === "online" ? "bg-neon-green/20 text-neon-green border border-neon-green/30" : customer.status === "expired" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
                      {(customer.status === "active" || customer.status === "online") && <Wifi size={12} />}{customer.status}
                    </span>
                  </td>
                  <td className="p-5 text-gray-400 font-medium">{customer.expireDate ? new Date(customer.expireDate).toLocaleDateString() : "N/A"}</td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/customers/${customer.id}`} className="p-2 text-gray-400 hover:text-neon-green hover:bg-neon-green/10 rounded-lg transition-colors"><Eye size={18} /></Link>
                      <Link href={`/admin/customers/${customer.id}/edit`} className="p-2 text-gray-400 hover:text-neon-blue hover:bg-neon-blue/10 rounded-lg transition-colors"><Edit size={18} /></Link>
                      <form action={deleteCustomer}>
                        <input type="hidden" name="id" value={customer.id} />
                        <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash size={18} /></button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
