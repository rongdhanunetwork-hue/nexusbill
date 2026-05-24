"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ArrowRight, Home, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"phone" | "otp" | "reset" | "success">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "send-otp", phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfo(data.message);
        setStep("otp");
      } else {
        setError(data.error);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "verify-otp", phone, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfo(null);
        setStep("reset");
      } else {
        setError(data.error);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "reset", phone, otp, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("success");
      } else {
        setError(data.error);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900">
      {/* Background glows */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-neon-blue/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          {step === "phone" && (
            <motion.form
              key="phone"
              onSubmit={handleSendOtp}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-8 border border-white/10"
            >
              <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 text-sm transition-colors">
                <Home size={15} /> Back to Home
              </Link>
              <div className="w-16 h-16 bg-neon-blue/20 rounded-2xl flex items-center justify-center text-neon-blue mb-6 shadow-[0_0_30px_rgba(0,243,255,0.2)]">
                <KeyRound size={32} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">Forgot Password</h1>
              <p className="text-gray-400 mb-8 text-sm">Enter your phone number to receive a verification OTP code</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full glass-input px-4 py-3 bg-slate-800 text-white"
                    placeholder="01XXXXXXXXX"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/40 font-semibold flex items-center justify-center gap-2 hover:bg-neon-blue/30 transition-all duration-200"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Send OTP Verification"}
                </button>
              </div>
            </motion.form>
          )}

          {step === "otp" && (
            <motion.form
              key="otp"
              onSubmit={handleVerifyOtp}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-8 border border-white/10"
            >
              <div className="flex gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
                >
                  ← Back to Phone
                </button>
                <span className="text-gray-600">|</span>
                <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
                  <Home size={15} /> Back to Home
                </Link>
              </div>
              <div className="w-16 h-16 bg-neon-blue/20 rounded-2xl flex items-center justify-center text-neon-blue mb-6 shadow-[0_0_30px_rgba(0,243,255,0.25)]">
                <CheckCircle2 size={32} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">Verify OTP</h1>
              <p className="text-gray-400 mb-8 text-sm">We have sent a verification code to {phone}</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Verification Code (OTP)</label>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full glass-input px-4 py-3 bg-slate-800 text-white font-mono text-center tracking-widest text-lg"
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>

                {info && (
                  <div className="text-teal-400 text-xs bg-teal-500/10 border border-teal-500/20 rounded-lg px-4 py-3">
                    {info}
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/40 font-semibold flex items-center justify-center gap-2 hover:bg-neon-blue/30 transition-all"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Verify Code"}
                </button>
              </div>
            </motion.form>
          )}

          {step === "reset" && (
            <motion.form
              key="reset"
              onSubmit={handleResetPassword}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-8 border border-white/10"
            >
              <div className="flex gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => setStep("otp")}
                  className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
                >
                  ← Back to OTP
                </button>
                <span className="text-gray-600">|</span>
                <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
                  <Home size={15} /> Back to Home
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">New Password</h1>
              <p className="text-gray-400 mb-8 text-sm">Create a secure new password for your account</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full glass-input px-4 py-3 bg-slate-800 text-white"
                      placeholder="Min 6 characters"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" tabIndex={-1}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full glass-input px-4 py-3 bg-slate-800 text-white"
                    placeholder="Repeat password"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/40 font-semibold flex items-center justify-center gap-2 hover:bg-neon-blue/30 transition-all"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Reset Password"}
                </button>
              </div>
            </motion.form>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-10 text-center"
            >
              <div className="w-20 h-20 bg-neon-green/20 text-neon-green rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(57,255,20,0.3)]">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Password Reset Successful!</h2>
              <p className="text-gray-400 mb-8">
                আপনার পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে। নতুন পাসওয়ার্ড দিয়ে লগইন করুন।
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/login/customer"
                  className="w-full py-3 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/30 font-semibold hover:bg-neon-green/30 transition-colors inline-block text-center"
                >
                  Customer Login
                </Link>
                <Link
                  href="/login/admin"
                  className="w-full py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/30 font-semibold hover:bg-neon-blue/30 transition-colors inline-block text-center"
                >
                  Admin Login
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
