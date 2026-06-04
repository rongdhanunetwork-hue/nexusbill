"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, UserCog, Trash2, Edit, RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Admin {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  status: string;
  createdAt: string | null;
}

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  async function fetchAdmins() {
    setLoading(true);
    const res = await fetch("/api/superadmin/admins");
    const data = await res.json();
    if (Array.isArray(data)) setAdmins(data);
    setLoading(false);
  }

  async function handleImpersonate(adminId: number) {
    setImpersonatingId(adminId);
    try {
      const res = await fetch("/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId })
      });
      const data = await res.json();
      if (res.ok && data.redirect) {
        window.location.href = data.redirect;
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to impersonate admin" });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Error trying to impersonate admin" });
      setTimeout(() => setStatusMsg(null), 3000);
    } finally {
      setImpersonatingId(null);
    }
  }

  useEffect(() => { fetchAdmins(); }, []);

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this admin?")) return;
    const res = await fetch(`/api/superadmin/admins?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setAdmins(prev => prev.filter(a => a.id !== id));
      setStatusMsg({ type: "success", text: "Admin deleted successfully" });
    } else {
      setStatusMsg({ type: "error", text: "Failed to delete admin" });
    }
    setTimeout(() => setStatusMsg(null), 3000);
  }

  async function handleToggleStatus(id: number, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    const res = await fetch("/api/superadmin/admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    if (res.ok) {
      setAdmins(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      setStatusMsg({ type: "success", text: `Admin ${newStatus === "active" ? "activated" : "suspended"}` });
    }
    setTimeout(() => setStatusMsg(null), 3000);
  }

  const filtered = admins.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.phone.includes(search)
  );

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <UserCog size={20} style={{ color: "#06b6d4" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Management</h1>
            <p className="text-xs text-gray-400">{admins.length} admin(s) in the system</p>
          </div>
        </div>
        <Link href="/superadmin/admins/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
          <Plus size={16} /> Add Admin
        </Link>
      </div>

      {/* Status Message */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${statusMsg.type === "success" ? "text-green-400" : "text-red-400"}`}
            style={{ background: statusMsg.type === "success" ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${statusMsg.type === "success" ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)"}` }}>
            {statusMsg.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {statusMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + Refresh */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
            className="w-full pl-9 pr-4 py-2 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
        <button onClick={fetchAdmins} className="p-2.5 rounded-xl text-gray-400 hover:text-white transition-colors"
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
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Admin</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500"><Loader2 size={20} className="animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500 text-sm">No admins found</td></tr>
              ) : filtered.map((admin, idx) => (
                <tr key={admin.id} className="transition-colors hover:bg-white/3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-5 py-3.5 text-xs text-gray-500 font-mono">{idx + 1}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg, #1e3a5f, #06b6d4)" }}>
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{admin.name}</p>
                        <p className="text-xs text-gray-500">{admin.address || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-300 font-mono">{admin.phone}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full`}
                      style={{
                        background: admin.status === "active" ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)",
                        color: admin.status === "active" ? "#34d399" : "#f87171",
                        border: `1px solid ${admin.status === "active" ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)"}`,
                      }}>
                      {admin.status?.toUpperCase() || "ACTIVE"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">
                    {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => handleImpersonate(admin.id)}
                        disabled={impersonatingId !== null}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 disabled:opacity-50"
                      >
                        {impersonatingId === admin.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : null}
                        Impersonate
                      </button>
                      <button onClick={() => handleToggleStatus(admin.id, admin.status)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all`}
                        style={{
                          background: admin.status === "active" ? "rgba(239,68,68,0.1)" : "rgba(52,211,153,0.1)",
                          color: admin.status === "active" ? "#f87171" : "#34d399",
                          border: `1px solid ${admin.status === "active" ? "rgba(239,68,68,0.2)" : "rgba(52,211,153,0.2)"}`,
                        }}>
                        {admin.status === "active" ? "Suspend" : "Activate"}
                      </button>
                      <Link href={`/superadmin/admins/${admin.id}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 transition-colors"
                        style={{ background: "rgba(6,182,212,0.08)" }}>
                        <Edit size={14} />
                      </Link>
                      <button onClick={() => handleDelete(admin.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                        style={{ background: "rgba(239,68,68,0.08)" }}>
                        <Trash2 size={14} />
                      </button>
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
