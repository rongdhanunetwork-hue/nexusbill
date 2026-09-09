"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function AddAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [adminCount, setAdminCount] = useState<number>(0);
  const [checkingLimit, setCheckingLimit] = useState(true);

  // Pre-check: fetch current admin count on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/superadmin/admins");
        const data = await res.json();
        if (Array.isArray(data)) {
          setAdminCount(data.length);
        }
      } catch (e) {
        console.error("Failed to check admin count:", e);
      } finally {
        setCheckingLimit(false);
      }
    })();
  }, []);

  const isLimitReached = adminCount >= 5;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Double-check limit client-side
    if (isLimitReached) {
      setError("সর্বোচ্চ ৫ জন এডমিন তৈরি করার সীমা পূর্ণ হয়ে গেছে! নতুন এডমিন যোগ করতে পূর্বের কোনো এডমিন মুছে ফেলুন।");
      return;
    }

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const password = String(form.get("password") || "").trim();
    const address = String(form.get("address") || "").trim();
    const validityDays = parseInt(String(form.get("validityDays") || "30"));
    const monthlyRentalFee = parseFloat(String(form.get("monthlyRentalFee") || "500"));

    if (!name || !phone || !password || password.length < 6) {
      setError("All fields required. Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/superadmin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, password, address, validityDays, monthlyRentalFee }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create admin.");
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/superadmin/admins"), 1500);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/superadmin/admins" className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.05)" }}>
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-white">Create New Admin</h1>
      </div>

      <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>

        {/* Limit Warning Banner */}
        {!checkingLimit && isLimitReached && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            <ShieldAlert size={22} className="shrink-0" />
            <div>
              <p className="text-sm font-bold">⚠️ সর্বোচ্চ ৫ জন এডমিন তৈরির সীমা পূর্ণ!</p>
              <p className="text-xs text-red-400/70 mt-0.5">নতুন এডমিন যোগ করতে পূর্বের কোনো এডমিন মুছে ফেলুন। বর্তমান এডমিন সংখ্যা: {adminCount}/5</p>
            </div>
          </div>
        )}

        {checkingLimit && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 size={14} className="animate-spin" /> Checking admin limit...
          </div>
        )}

        <div className="space-y-4" style={{ opacity: isLimitReached ? 0.4 : 1, pointerEvents: isLimitReached ? "none" : "auto" }}>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name *</label>
            <input name="name" required placeholder="Admin full name"
              className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number *</label>
            <input name="phone" type="tel" required placeholder="01XXXXXXXXX"
              className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Address</label>
            <input name="address" placeholder="Admin address (optional)"
              className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Account Validity (Days) *</label>
            <input name="validityDays" type="number" required defaultValue="30" min="1"
              className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Monthly Software Rental Fee (BDT) *</label>
            <input name="monthlyRentalFee" type="number" required defaultValue="500" min="0" step="10"
              className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Password *</label>
            <div className="relative">
              <input name="password" type={showPwd ? "text" : "password"} required minLength={6} placeholder="Min 6 characters"
                className="w-full px-4 py-2.5 pr-12 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-400"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-green-400"
            style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
            <CheckCircle2 size={15} /> Admin created successfully! Redirecting...
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading || success || isLimitReached || checkingLimit}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
            {loading ? <><Loader2 size={15} className="animate-spin" /> Creating...</> : <><Save size={15} /> Create Admin</>}
          </button>
          <Link href="/superadmin/admins" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            Cancel
          </Link>
        </div>
      </motion.form>
    </div>
  );
}
