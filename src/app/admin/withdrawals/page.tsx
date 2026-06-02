"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownCircle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Search,
  Check,
  X,
  FileText,
  AlertTriangle,
  Phone,
  User
} from "lucide-react";
import { usePopup } from "@/components/ui/PopupProvider";

interface ResellerInfo {
  id: number;
  name: string;
  phone: string;
  walletBalance: string | null;
}

interface WithdrawalRequest {
  id: number;
  resellerId: number;
  amount: string;
  method: string | null;
  account: string | null;
  status: string | null;
  note: string | null;
  createdAt: string | null;
  reseller?: ResellerInfo | null;
}

export default function AdminWithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [showModalId, setShowModalId] = useState<number | null>(null);
  const { showAlert } = usePopup();

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/withdrawals");
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
      const res = await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, note: adminNote }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await showAlert({ title: "Success", message: `Withdrawal request successfully ${action === "approve" ? "approved" : "rejected"}!`, type: "success" });
        setShowModalId(null);
        setAdminNote("");
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
      r.reseller?.name.toLowerCase().includes(search.toLowerCase()) ||
      r.reseller?.phone.toLowerCase().includes(search.toLowerCase()) ||
      r.account?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
            <XCircle size={12} /> Rejected
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
  const totalApproved = requests
    .filter(r => r.status === "approved")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3">
            <ArrowDownCircle className="text-neon-blue" /> Reseller Withdrawals Approval
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            রিসেলারদের উইথড্র রিকোয়েস্ট যাচাই করুন এবং ব্যালেন্স অনুমোদন বা প্রত্যাখ্যান করুন।
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

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 border border-yellow-500/20 relative overflow-hidden">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Withdrawals</span>
          <div className="text-3xl font-extrabold text-yellow-400 mt-2">{pendingCount} requests</div>
        </div>

        <div className="glass-card p-6 border border-neon-green/20 relative overflow-hidden">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Disbursed Cash</span>
          <div className="text-3xl font-extrabold text-neon-green mt-2">৳{totalApproved.toFixed(2)}</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search reseller, account..."
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

      {/* Requests Table */}
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
                  <th className="px-6 py-4">Reseller Details</th>
                  <th className="px-6 py-4">Payout Method</th>
                  <th className="px-6 py-4 text-right">Requested Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submitted Date</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No withdrawal requests found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      {/* Reseller Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-purple-400">
                            <User size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-white text-sm">{r.reseller?.name || "Unknown Reseller"}</span>
                            <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                              <Phone size={10} /> {r.reseller?.phone}
                            </span>
                            <span className="text-[10px] text-purple-300 font-bold mt-0.5">
                              Wallet Balance: ৳{Number(r.reseller?.walletBalance || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-white text-sm uppercase">{r.method}</span>
                          <span className="text-xs font-mono text-gray-400">{r.account}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className="font-extrabold text-white text-sm">৳{Number(r.amount).toFixed(2)}</span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(r.status)}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString("en-BD") : "N/A"}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {r.status === "pending" ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setShowModalId(r.id);
                                setActionType("approve");
                              }}
                              className="p-1.5 rounded-lg bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 transition-all"
                              title="Approve Payout"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setShowModalId(r.id);
                                setActionType("reject");
                              }}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                              title="Reject Payout"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 font-mono italic">
                            Processed: {r.note || "No notes"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation & Note input Modal */}
      <AnimatePresence>
        {showModalId && actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 text-left space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <AlertTriangle size={18} className={actionType === "approve" ? "text-neon-green animate-bounce" : "text-red-400"} />
                <h3 className="text-lg font-bold text-white uppercase">
                  {actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
                </h3>
              </div>

              <p className="text-xs text-gray-300">
                {actionType === "approve"
                  ? "Are you sure you want to approve this withdrawal? The reseller's balance will be deducted immediately."
                  : "Are you sure you want to reject this request? Please provide a reason to notify the reseller."}
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">Admin Remarks / Note</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={actionType === "approve" ? "Transaction ID or confirmation detail..." : "Insufficient balance, invalid account number..."}
                  className="w-full glass-input px-3.5 py-2.5 bg-slate-950/40 text-xs text-white h-20 resize-none"
                  required={actionType === "reject"}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => {
                    setShowModalId(null);
                    setAdminNote("");
                  }}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-gray-300 text-xs font-semibold rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(showModalId, actionType)}
                  disabled={processingId !== null}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                    actionType === "approve"
                      ? "bg-neon-green/20 text-neon-green border border-neon-green/30 hover:bg-neon-green/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                  }`}
                >
                  {processingId !== null ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    "Proceed"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
