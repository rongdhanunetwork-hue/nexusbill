"use client";

import { useState, useEffect } from "react";
import { Users, Search, RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface User {
  id: number;
  name: string;
  phone: string;
  role: string;
  status: string | null;
  walletBalance: string | null;
  createdAt: string | null;
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/users");
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <Users size={20} style={{ color: "#fbbf24" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">System Users</h1>
            <p className="text-xs text-gray-400">{users.length} user(s) total in the system</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
            className="w-full pl-9 pr-4 py-2 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
        
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="px-4 py-2 text-sm text-white rounded-xl bg-[#0d1117] focus:outline-none cursor-pointer"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <option value="all">All Roles</option>
          <option value="reseller">Resellers</option>
          <option value="employee">Employees</option>
          <option value="customer">Customers</option>
        </select>

        <button onClick={fetchUsers} className="p-2.5 rounded-xl text-gray-400 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Wallet / Info</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-500"><Loader2 size={20} className="animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-500 text-sm">No users found</td></tr>
              ) : filtered.map((user, idx) => (
                <tr key={user.id} className="transition-colors hover:bg-white/3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-5 py-3.5 text-xs text-gray-500 font-mono">{idx + 1}</td>
                  <td className="px-5 py-3.5 font-semibold text-white">{user.name}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-300 font-mono">{user.phone}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}
                      style={{
                        background: user.role === "reseller" ? "rgba(167,139,250,0.15)" : user.role === "employee" ? "rgba(251,146,60,0.15)" : "rgba(6,182,212,0.15)",
                        color: user.role === "reseller" ? "#c084fc" : user.role === "employee" ? "#fb923c" : "#22d3ee",
                        border: `1px solid ${user.role === "reseller" ? "rgba(167,139,250,0.3)" : user.role === "employee" ? "rgba(251,146,60,0.3)" : "rgba(6,182,212,0.3)"}`
                      }}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-300">
                    {user.role === "reseller" ? (
                      <span className="font-mono text-xs text-yellow-500 font-bold">৳{Number(user.walletBalance || 0).toFixed(2)}</span>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full`}
                      style={{
                        background: user.status === "active" ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)",
                        color: user.status === "active" ? "#34d399" : "#f87171",
                        border: `1px solid ${user.status === "active" ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)"}`,
                      }}>
                      {(user.status || "active").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
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
