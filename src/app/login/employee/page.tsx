"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Headphones, ArrowRight, Home, ShieldAlert, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const phone = String(form.get("phone") || "").trim();
    const password = String(form.get("password") || "").trim();

    if (!phone || !password) {
      setError("Phone number and password required.");
      triggerShake();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password, role: "employee", rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed.");
        triggerShake();
        return;
      }

      router.push("/employee");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900">
      {/* Background glow */}
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-orange-500/20 rounded-full blur-[100px] pointer-events-none" />

      <motion.form
        onSubmit={handleLogin}
        animate={shake ? { x: [-12, 12, -12, 12, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-8 w-full max-w-md relative z-10 border border-white/10"
      >
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 text-sm transition-colors">
          <Home size={15} /> Back to Home
        </Link>

        <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-400 mb-6 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
          <Headphones size={32} />
        </div>

        <h1 className="text-3xl font-bold text-white mb-1">Employee Login</h1>
        <p className="text-gray-400 mb-2 text-sm">Employee portal access. Demo: 01600000000 / password123</p>
        <p className="text-xs text-orange-300 mb-8 flex gap-2"><ShieldAlert size={14} className="shrink-0" /> Restricted: core network settings and total company income are hidden.</p>

        <div className="space-y-5">
          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Phone/User ID</label>
            <input
              name="phone"
              type="tel"
              autoComplete="username"
              required
              className="w-full glass-input px-4 py-3"
              placeholder="016XXXXXXXX"
            />
          </div>

          {/* Password with show/hide */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-300">Password</label>
              <Link href="/login/forgot-password" className="text-xs text-orange-400 hover:underline">Forgot Password?</Link>
            </div>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="w-full glass-input px-4 py-3 pr-12"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-white/10 text-orange-400 focus:ring-orange-400 bg-slate-800 accent-orange-500 cursor-pointer"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300 cursor-pointer select-none">
              Remember me / লগইন সেশন সেভ রাখুন
            </label>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
            >
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-orange-500/20 text-orange-300 border border-orange-400/40 font-semibold flex items-center justify-center gap-2 hover:bg-orange-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Logging in...
              </>
            ) : (
              <>
                Login to Employee <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
