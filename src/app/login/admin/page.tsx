"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, ArrowRight, Home, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
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
        body: JSON.stringify({ phone, password, role: "admin", rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed.");
        triggerShake();
        return;
      }

      router.push("/admin");
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
      {/* Background glows */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-neon-blue/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />

      <motion.form
        onSubmit={handleLogin}
        animate={shake ? { x: [-12, 12, -12, 12, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-8 w-full max-w-md relative z-10 border border-white/10"
      >
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 text-sm transition-colors">
          <Home size={15} /> Back to Home
        </Link>

        <div className="w-16 h-16 bg-neon-blue/20 rounded-2xl flex items-center justify-center text-neon-blue mb-6 shadow-[0_0_30px_rgba(0,243,255,0.25)]">
          <Shield size={32} />
        </div>

        <h1 className="text-3xl font-bold text-white mb-1">Admin Login</h1>
        <p className="text-gray-400 mb-8 text-sm">ISP Management System</p>

        <div className="space-y-5">
          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
            <input
              name="phone"
              type="tel"
              autoComplete="username"
              required
              className="w-full glass-input px-4 py-3"
              placeholder="01700000000"
            />
          </div>

          {/* Password with show/hide */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-300">Password</label>
              <Link href="/login/forgot-password" className="text-xs text-neon-blue hover:underline">Forgot Password?</Link>
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
              className="h-4 w-4 rounded border-white/10 text-neon-blue focus:ring-neon-blue bg-slate-800 accent-neon-blue cursor-pointer"
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
            className="w-full py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/40 font-semibold flex items-center justify-center gap-2 hover:bg-neon-blue/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Logging in...
              </>
            ) : (
              <>
                Login to Admin <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
