"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Search,
  Check,
  X,
  Zap,
  ArrowRight,
  Phone,
  User
} from "lucide-react";
import { usePopup } from "@/components/ui/PopupProvider";
import { Pagination } from "@/components/ui/Pagination";

interface UserInfo {
  id: number;
  name: string;
  phone: string;
  pppoeUsername: string | null;
  status: string | null;
}

interface Package {
  id: number;
  name: string;
  speed: string;
  price: string;
}

interface PackageChangeRequest {
  id: number;
  userId: number;
  currentPackageId: number | null;
  requestedPackageId: number;
  status: string | null;
  createdAt: string | null;
  user?: UserInfo | null;
  currentPackage?: Package | null;
  requestedPackage?: Package | null;
}

export default function AdminPackageRequestsPage() {
  const [requests, setRequests] = useState<PackageChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const { showConfirm, showAlert } = usePopup();

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/package-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: number, action: "approve" | "reject") {
    setProcessingId(id);
    try {
      const res = await fetch("/api/admin/package-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await showAlert({ title: "Success", message: `Request successfully ${action === "approve" ? "approved & synced" : "rejected"}!`, type: "success" });
        fetchRequests();
      } else {
        await showAlert({ title: "Failed", message: data.error || "Failed to process request", type: "error" });
      }
    } catch {
      await showAlert({ title: "Error", message: "Network error", type: "error" });
    } finally {
      setProcessingId(null);
    }
  }

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.user?.name.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.phone.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.pppoeUsername?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const paginatedRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neon-green/10 text-neon-green border border-neon-green/20 flex items-center gap-1 w-fit">
            <CheckCircle size={12} /> Approved
          </span>
        );
      case "rejected":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 w-fit">
            <XCircle size={12} /> Declined
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1 w-fit animate-pulse">
            <Clock size={12} /> Pending
          </span>
        );
    }
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3">
            <TrendingUp className="text-neon-blue" /> Package Change Requests
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            গ্রাহকদের পাঠানো প্যাকেজ পরিবর্তনের আবেদনগুলো অনুমোদন করুন এবং MikroTik ও Billing এ সিঙ্ক করুন।
          </p>
        </div>
        <button
          onClick={fetchRequests}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition disabled:opacity-50 text-white shrink-0 self-start sm:self-auto"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin text-neon-blue" />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh
        </button>
      </div>

      {/* Stats Card */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 border border-yellow-500/20 relative overflow-hidden">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Migrations</span>
          <div className="text-3xl font-extrabold text-yellow-400 mt-2">{pendingCount} requests</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search customer name, phone, PPPoE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input pl-10 pr-4 py-2.5 bg-slate-900/30 text-white border border-white/10 focus:border-neon-blue/50 rounded-xl text-sm"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full glass-input px-4 py-2.5 bg-slate-900/30 text-white border border-white/10 focus:border-neon-blue/50 rounded-xl text-sm select-chevron"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Requests</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 size={40} className="animate-spin text-neon-blue" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden border border-white/5 shadow-2xl">
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-900/60 border-b border-white/5 text-gray-400 uppercase text-[11px] font-bold tracking-wider">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Current Active Plan</th>
                  <th className="px-6 py-4">Requested New Plan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submitted Date</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No package change requests found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      {/* Customer Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neon-blue">
                            <User size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-white text-sm">{r.user?.name || "Unknown"}</span>
                            <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                              <Phone size={10} /> {r.user?.phone}
                            </span>
                            {r.user?.pppoeUsername && (
                              <span className="text-[10px] text-gray-500 font-mono mt-0.5">
                                PPPoE: {r.user.pppoeUsername}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Current Plan */}
                      <td className="px-6 py-4">
                        {r.currentPackage ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-white text-sm">{r.currentPackage.name}</span>
                            <span className="text-xs text-gray-400 font-mono">
                              {r.currentPackage.speed} - ৳{r.currentPackage.price}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">No Active Plan</span>
                        )}
                      </td>

                      {/* Requested Plan */}
                      <td className="px-6 py-4">
                        {r.requestedPackage ? (
                          <div className="flex items-center gap-2">
                            <ArrowRight size={14} className="text-neon-blue" />
                            <div className="flex flex-col">
                              <span className="font-extrabold text-neon-green text-sm flex items-center gap-1">
                                <Zap size={12} className="text-neon-green" /> {r.requestedPackage.name}
                              </span>
                              <span className="text-xs text-neon-green font-mono">
                                {r.requestedPackage.speed} - ৳{r.requestedPackage.price}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-red-400">Plan details missing</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(r.status)}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString("en-BD") : "N/A"}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {r.status === "pending" ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={async () => {
                                const isConfirm = await showConfirm({
                                  title: "Approve Request",
                                  message: "Are you sure you want to APPROVE this package change request?",
                                  confirmText: "Approve"
                                });
                                if (isConfirm) {
                                  handleAction(r.id, "approve");
                                }
                              }}
                              disabled={processingId !== null}
                              className="p-1.5 rounded-lg bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 transition-all"
                              title="Approve & Sync"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={async () => {
                                const isConfirm = await showConfirm({
                                  title: "Decline Request",
                                  message: "Are you sure you want to DECLINE this package change request?",
                                  danger: true,
                                  confirmText: "Decline"
                                });
                                if (isConfirm) {
                                  handleAction(r.id, "reject");
                                }
                              }}
                              disabled={processingId !== null}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                              title="Decline"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 font-mono italic">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredRequests.length > 0 && (
            <div className="p-4 border-t border-white/10">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.max(1, Math.ceil(filteredRequests.length / pageSize))}
                totalItems={filteredRequests.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
