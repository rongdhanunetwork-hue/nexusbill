"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  ArrowDownCircle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  AlertCircle
} from "lucide-react";

interface WithdrawalRequest {
  id: number;
  amount: string;
  method: string | null;
  account: string | null;
  status: string | null;
  note: string | null;
  createdAt: string | null;
}

export default function WithdrawClient({ initialBalance }: { initialBalance: number }) {
  const [balance, setBalance] = useState(initialBalance);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bkash");
  const [account, setAccount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const res = await fetch("/api/reseller/withdraw");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const withdrawAmt = Number(amount);
    if (isNaN(withdrawAmt) || withdrawAmt <= 0) {
      setError("সঠিক পরিমাণ লিখুন (Enter a valid amount)");
      return;
    }

    if (withdrawAmt > balance) {
      setError(`পর্যাপ্ত ব্যালেন্স নেই। আপনার বর্তমান ব্যালেন্স: ৳${balance.toFixed(2)}`);
      return;
    }

    if (!account.trim()) {
      setError("অ্যাকাউন্ট নম্বর লিখুন (Enter account details)");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reseller/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: withdrawAmt, method, account, note }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess("আপনার উইথড্র রিকোয়েস্ট সফলভাবে সাবমিট হয়েছে!");
        setAmount("");
        setAccount("");
        setNote("");
        fetchHistory();
        // Update local wallet view
        setBalance(prev => prev - withdrawAmt);
      } else {
        setError(data.error || "রিকোয়েস্ট সাবমিট করতে ব্যর্থ হয়েছে");
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
            <XCircle size={12} /> Rejected
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

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3">
          <ArrowDownCircle className="text-purple-400" /> Wallet Withdraw Request
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          আপনার ওয়ালেট ব্যালেন্স নগদ বা ব্যাংক ট্রান্সফারের মাধ্যমে এডমিনের কাছ থেকে ক্যাশ আউট বা উইথড্র করুন।
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Left Form Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Wallet Balance Card */}
          <div className="glass-card p-6 border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.05)] relative overflow-hidden group">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 text-purple-400 group-hover:scale-110 transition-transform">
              <Wallet size={120} />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Balance</span>
            <div className="text-3xl font-extrabold text-purple-300 mt-2">৳{balance.toFixed(2)}</div>
            <p className="text-[11px] text-gray-500 mt-2">* রিকোয়েস্ট অনুমোদিত হওয়ার পর এই টাকা ওয়ালেট থেকে কর্তন করা হবে।</p>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
            <h2 className="text-base font-bold text-white border-b border-white/5 pb-3">New Payout Request</h2>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">উইথড্র পরিমাণ (Amount in ৳) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1000"
                className="w-full glass-input px-3.5 py-2.5 bg-slate-950/40 text-sm text-white"
                required
              />
            </div>

            {/* Method */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">পেমেন্ট মাধ্যম (Payout Method) *</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 bg-slate-900 text-sm text-white"
              >
                <option value="bkash">bKash Personal</option>
                <option value="nagad">Nagad Personal</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>

            {/* Account Info */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">অ্যাকাউন্ট নম্বর / বিবরণ (Account details) *</label>
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="Mobile number or Bank detail..."
                className="w-full glass-input px-3.5 py-2.5 bg-slate-950/40 text-sm text-white"
                required
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">নোট (Optional Note)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any special instruction..."
                className="w-full glass-input px-3.5 py-2.5 bg-slate-950/40 text-sm text-white h-20 resize-none"
              />
            </div>

            {/* Success / Error alerts */}
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
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold hover:bg-purple-500/30 transition disabled:opacity-50 text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send size={16} /> Submit Payout Request
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Payout History Table Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-4 flex items-center justify-between border-b border-white/5">
            <span className="font-semibold text-white">Withdrawal History</span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 size={32} className="animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="glass-card overflow-hidden border border-white/5 shadow-2xl">
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-white/5 text-gray-400 uppercase text-[11px] font-bold tracking-wider">
                      <th className="px-6 py-4">Method & Account</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Admin Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {requests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                          উইথড্র রিকোয়েস্টের কোনো হিস্টোরি পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      requests.map((r) => (
                        <tr key={r.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-white text-sm uppercase">{r.method}</span>
                              <span className="text-xs font-mono text-gray-400">{r.account}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <span className="font-extrabold text-white text-sm">৳{Number(r.amount).toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(r.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-gray-300 break-words max-w-[150px] block">
                              {r.note || "—"}
                            </span>
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
