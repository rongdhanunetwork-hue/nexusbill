"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Edit, Trash, Wifi, WifiOff, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Customer {
  id: number;
  role: string;
  name: string;
  phone: string;
  address: string | null;
  photoUrl: string | null;
  nidUrl: string | null;
  pppoeUsername: string | null;
  macAddress: string | null;
  packageId: number | null;
  status: string | null;
  approvalStatus: string | null;
  expireDate: string | Date | null;
  createdAt: string | Date | null;
  package?: { name: string; price: string } | null;
}

export default function CustomersClient({
  allCustomers,
  deleteCustomerAction,
}: {
  allCustomers: Customer[];
  deleteCustomerAction: (formData: FormData) => Promise<void>;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  // Filter logic
  const filteredCustomers = allCustomers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.pppoeUsername || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All Status" ||
      (statusFilter === "Active" && (customer.status === "active" || customer.status === "online")) ||
      (customer.status || "").toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, phone or PPPoE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 glass-input bg-slate-800 focus:ring-neon-blue focus:ring-2"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="glass-input px-4 py-2.5 bg-slate-800 w-full sm:w-auto focus:ring-neon-blue focus:ring-2 cursor-pointer"
        >
          <option value="All Status" className="bg-slate-800">All Status</option>
          <option value="Active" className="bg-slate-800">Active / Online</option>
          <option value="Offline" className="bg-slate-800">Offline</option>
          <option value="Expired" className="bg-slate-800">Expired</option>
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
            <AnimatePresence mode="popLayout">
              {filteredCustomers.length === 0 ? (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    <WifiOff size={40} className="mx-auto mb-3 text-gray-600" />
                    No customers found matching the criteria.
                  </td>
                </motion.tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <motion.tr
                    key={customer.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-5">
                      <Link href={`/admin/customers/${customer.id}`} className="font-bold text-white hover:text-neon-blue text-base transition-colors">
                        {customer.name}
                      </Link>
                      <div className="text-sm text-gray-400">{customer.phone}</div>
                      <div className="text-xs text-gray-500 max-w-48 truncate">{customer.address || "No address"}</div>
                    </td>
                    <td className="p-5 text-sm">
                      <div className="text-gray-300">Photo: {customer.photoUrl ? <span className="text-neon-green">Uploaded</span> : <span className="text-gray-500">No</span>}</div>
                      <div className="text-gray-400">NID: {customer.nidUrl ? <span className="text-neon-green">Uploaded</span> : <span className="text-gray-500">No</span>}</div>
                    </td>
                    <td className="p-5">
                      <div className="text-gray-300 font-medium">{customer.pppoeUsername || "N/A"}</div>
                      <div className="text-xs text-neon-blue mt-1 font-semibold">{customer.package?.name || "No Plan"}</div>
                    </td>
                    <td className="p-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${customer.status === "active" || customer.status === "online" ? "bg-neon-green/20 text-neon-green border border-neon-green/30" : customer.status === "expired" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
                        {(customer.status === "active" || customer.status === "online") && <Wifi size={12} />}
                        {customer.status || "offline"}
                      </span>
                    </td>
                    <td className="p-5 text-gray-400 font-medium">
                      {customer.expireDate ? new Date(customer.expireDate).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/customers/${customer.id}`} className="p-2 text-gray-400 hover:text-neon-green hover:bg-neon-green/10 rounded-lg transition-all"><Eye size={18} /></Link>
                        <Link href={`/admin/customers/${customer.id}/edit`} className="p-2 text-gray-400 hover:text-neon-blue hover:bg-neon-blue/10 rounded-lg transition-all"><Edit size={18} /></Link>
                        <form action={deleteCustomerAction} onSubmit={(e) => { if(!confirm("Are you sure you want to delete this customer?")) e.preventDefault(); }}>
                          <input type="hidden" name="id" value={customer.id} />
                          <button type="submit" className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"><Trash size={18} /></button>
                        </form>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
