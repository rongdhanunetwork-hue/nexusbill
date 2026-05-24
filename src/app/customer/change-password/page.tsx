"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Loader2, CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("new_password") || "").trim();
    const confirmPassword = String(form.get("confirm_password") || "").trim();

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });

    setLoading(false);

    if (res.ok) {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to change password.");
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white tracking-wide">Change Password</h1>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 md:p-8 space-y-6"
      >
        <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 mb-2">
          <Shield size={28} />
        </div>
        <p className="text-gray-400 text-sm">Enter a new password for your account.</p>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
          <div className="relative">
            <input
              name="new_password"
              type={showNew ? "text" : "password"}
              required
              minLength={6}
              placeholder="Min 6 characters"
              className="w-full glass-input px-4 py-3 pr-12"
            />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" tabIndex={-1}>
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
          <div className="relative">
            <input
              name="confirm_password"
              type={showConfirm ? "text" : "password"}
              required
              minLength={6}
              placeholder="Repeat password"
              className="w-full glass-input px-4 py-3 pr-12"
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" tabIndex={-1}>
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <AlertCircle size={16} />{error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-neon-green text-sm bg-neon-green/10 border border-neon-green/20 rounded-lg px-4 py-3">
            <CheckCircle2 size={16} />Password changed successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold hover:bg-purple-500/30 transition-colors disabled:opacity-50"
        >
          {loading ? <><Loader2 size={18} className="animate-spin" /> Changing...</> : <><Shield size={18} /> Change Password</>}
        </button>
      </motion.form>
    </div>
  );
}
