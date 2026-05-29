"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function ResellerSettingsPage() {
  const [savingPwd, setSavingPwd] = useState(false);
  const [savedPwd, setSavedPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("new_password") || "").trim();
    const confirmPassword = String(form.get("confirm_password") || "").trim();

    if (newPassword.length < 6) {
      setPwdError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("Passwords do not match.");
      return;
    }

    setSavingPwd(true);
    setPwdError(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      setSavingPwd(false);
      if (res.ok) {
        setSavedPwd(true);
        setTimeout(() => setSavedPwd(false), 3000);
        (e.target as HTMLFormElement).reset();
      } else {
        const d = await res.json();
        setPwdError(d.error || "Failed to change password.");
      }
    } catch {
      setPwdError("Network error. Please try again.");
      setSavingPwd(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-white tracking-wide">Reseller Settings</h1>

      {/* Change Password */}
      <form onSubmit={handleChangePassword}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-4 flex items-center gap-2">
            <Shield size={18} className="text-purple-400" /> Change Reseller Password
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
              <div className="relative">
                <input
                  name="new_password"
                  type={showNewPwd ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  className="w-full glass-input px-4 py-3 pr-12 bg-slate-800 text-white border border-white/10"
                />
                <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" tabIndex={-1}>
                  {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  name="confirm_password"
                  type={showConfirmPwd ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Repeat password"
                  className="w-full glass-input px-4 py-3 pr-12 bg-slate-800 text-white border border-white/10"
                />
                <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" tabIndex={-1}>
                  {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          {pwdError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{pwdError}</p>
          )}
          <button
            type="submit"
            disabled={savingPwd}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold hover:bg-purple-500/30 transition-colors disabled:opacity-50"
          >
            {savingPwd ? (
              <><Loader2 size={18} className="animate-spin" /> Changing...</>
            ) : savedPwd ? (
              <><CheckCircle2 size={18} className="text-neon-green" /> Password Changed!</>
            ) : (
              <><Shield size={18} /> Change Password</>
            )}
          </button>
        </motion.div>
      </form>
    </div>
  );
}
