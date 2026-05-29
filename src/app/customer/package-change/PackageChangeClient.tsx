"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Zap,
  ArrowRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  AlertCircle
} from "lucide-react";

interface Package {
  id: number;
  name: string;
  speed: string;
  price: string;
  durationDays: number | null;
}

interface PackageChangeRequest {
  id: number;
  userId: number;
  currentPackageId: number | null;
  requestedPackageId: number;
  status: string | null;
  createdAt: string | null;
  currentPackage?: Package | null;
  requestedPackage?: Package | null;
}

export default function PackageChangeClient({
  currentPackage,
  availablePackages,
}: {
  currentPackage: Package | null;
  availablePackages: Package[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const [history, setHistory] = useState<PackageChangeRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const res = await fetch("/api/customer/package-change");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedId) {
      setError("দয়া করে একটি নতুন প্যাকেজ সিলেক্ট করুন");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/package-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestedPackageId: Number(selectedId) }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess("প্যাকেজ পরিবর্তনের রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে!");
        setSelectedId("");
        fetchHistory();
      } else {
        setError(data.error || "রিকোয়েস্ট পাঠাতে ব্যর্থ হয়েছে");
      }
    } catch {
      setError("নেটওয়ার্ক ত্রুটি, অনুগ্রহ করে আবার চেষ্টা করুন");
    } finally {
      setSubmitting(false);
    }
  }

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
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1 w-fit">
            <Clock size={12} /> Pending
          </span>
        );
    }
  };

  const otherPackages = availablePackages.filter(p => p.id !== currentPackage?.id);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3">
          <TrendingUp className="text-neon-green" /> Package Change Request
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          আপনার বর্তমান ইন্টারনেট প্যাকেজ পরিবর্তন করুন। এডমিনের অনুমোদনের পর প্যাকেজ আপডেট করা হবে।
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Left Form Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current Package Details Card */}
          <div className="glass-card p-6 border border-neon-green/20 relative overflow-hidden group">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 text-neon-green group-hover:scale-110 transition-transform">
              <Zap size={120} />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Active Plan</span>
            {currentPackage ? (
              <div className="mt-3 space-y-2">
                <div className="text-2xl font-extrabold text-white flex items-center gap-1.5">
                  <Zap size={22} className="text-neon-green" /> {currentPackage.name}
                </div>
                <div className="flex gap-4 text-xs font-semibold text-gray-300">
                  <div>Speed: <span className="text-neon-green">{currentPackage.speed}</span></div>
                  <div>Price: <span className="text-neon-green">৳{currentPackage.price}</span></div>
                </div>
              </div>
            ) : (
              <div className="text-sm font-semibold text-gray-500 mt-2">No Active Package Assigned</div>
            )}
          </div>

          {/* Package Selector Form */}
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
            <h2 className="text-base font-bold text-white border-b border-white/5 pb-3">Request New Plan</h2>

            {/* Select Package dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">নতুন প্যাকেজ নির্বাচন করুন *</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 bg-slate-900 text-sm text-white select-chevron"
                required
              >
                <option value="">-- Choose Package --</option>
                {otherPackages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.speed} - ৳{p.price})
                  </option>
                ))}
              </select>
            </div>

            {/* Transition View */}
            {selectedId && currentPackage && (() => {
              const selectedPkg = availablePackages.find(p => p.id === Number(selectedId));
              if (!selectedPkg) return null;
              return (
                <div className="p-4 rounded-xl border border-white/5 bg-slate-950/60 space-y-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Plan Migration Preview</span>
                  <div className="flex items-center gap-3 text-xs text-white">
                    <div className="font-semibold">{currentPackage.name}</div>
                    <ArrowRight size={14} className="text-neon-green" />
                    <div className="font-bold text-neon-green flex items-center gap-1">
                      <Sparkles size={12} className="text-yellow-400" /> {selectedPkg.name}
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    * মাইগ্রেশন ফি প্রযোজ্য নয়। রিকোয়েস্টটি অনুমোদিত হলে স্পিড প্রোফাইল সাথে সাথে আপডেট হবে।
                  </div>
                </div>
              );
            })()}

            {/* Success / Error Alerts */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2"
                >
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3.5 rounded-xl bg-neon-green/10 border border-neon-green/20 text-xs text-neon-green flex items-start gap-2"
                >
                  <CheckCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/30 font-semibold hover:bg-neon-green/30 transition disabled:opacity-50 text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <TrendingUp size={16} /> Submit Upgrade Request
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Panel History */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-4 flex items-center justify-between border-b border-white/5">
            <span className="font-semibold text-white">Migration History</span>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 size={32} className="animate-spin text-neon-green" />
            </div>
          ) : (
            <div className="glass-card overflow-hidden border border-white/5 shadow-2xl">
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-white/5 text-gray-400 uppercase text-[11px] font-bold tracking-wider">
                      <th className="px-6 py-4">From Plan</th>
                      <th className="px-6 py-4">To Requested Plan</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                          প্যাকেজ পরিবর্তনের কোনো পূর্ববর্তী রেকর্ড নেই।
                        </td>
                      </tr>
                    ) : (
                      history.map((h) => (
                        <tr key={h.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-white text-sm">
                              {h.currentPackage?.name || "No Plan"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-bold text-neon-green text-sm">
                              {h.requestedPackage?.name || "Unknown Plan"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(h.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                            {h.createdAt ? new Date(h.createdAt).toLocaleDateString("en-BD") : "N/A"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
