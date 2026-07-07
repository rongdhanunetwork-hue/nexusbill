"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, AlertCircle, Loader2, ChevronDown, Lock, Phone } from "lucide-react";

const roles = [
  { id: "superadmin", label: "Super Admin", color: "#facc15" },
  { id: "admin", label: "Admin", color: "#00f3ff" },
  { id: "reseller", label: "Reseller", color: "#a78bfa" },
  { id: "employee", label: "Employee", color: "#fb923c" },
  { id: "customer", label: "Customer", color: "#4ade80" },
];

const fadeUp: any = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" } }),
};

export default function UnifiedLoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const activeRole = roles.find(r => r.id === selectedRole)!;

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const phone = String(form.get("phone") || "").trim();
    const password = String(form.get("password") || "").trim();

    if (!phone || (!password && !require2FA)) { setError("Phone number and password required."); triggerShake(); return; }
    if (require2FA && !otpToken) { setError("OTP is required."); triggerShake(); return; }

    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password, role: selectedRole, rememberMe, otpToken: require2FA ? otpToken : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "2FA_REQUIRED") { setRequire2FA(true); setError(null); return; }
        setError(data.error || "Login failed."); triggerShake(); return;
      }
      router.push(`/${selectedRole}`); router.refresh();
    } catch { setError("Network error. Please try again."); triggerShake(); }
    finally { setLoading(false); }
  }

  function triggerShake() { setShake(true); setTimeout(() => setShake(false), 600); }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: 'rgba(0,243,255,0.18)' }} />
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.12, 0.2, 0.12] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full blur-[100px]" style={{ background: 'rgba(139,92,246,0.2)' }} />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full glass-card shadow-2xl rounded-2xl border border-white/10 overflow-hidden"
        style={{ maxWidth: '1000px', minHeight: '580px', display: 'flex' }}
      >
        {/* Left - Image Panel (40%) */}
        <div className="login-image-panel" style={{ flex: '0 0 40%', position: 'relative', display: 'none' }}>
          <img src="/img/login-bg.jpg" alt="background"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          {/* Gradient overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,243,255,0.15) 0%, rgba(0,0,0,0.55) 100%)', zIndex: 1 }} />
          {/* Animated shine line */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
            style={{ position: 'absolute', top: 0, left: 0, width: '60%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)', zIndex: 2, pointerEvents: 'none' }}
          />
        </div>

        {/* Right - Form Panel (60%) */}
        <motion.div
          style={{ flex: 1, minWidth: 0 }}
          animate={shake ? { x: [-10, 10, -10, 10, -5, 5, 0] } : { x: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col justify-center p-8 lg:p-12 relative"
        >
          {/* Subtle gradient bg on form side */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(0,243,255,0.03) 0%, transparent 60%)', pointerEvents: 'none' }} />

          <div className="relative z-10 w-full max-w-md mx-auto">
            {/* Logo + Name */}
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="flex items-center gap-4 mb-8">
              <img src="/img/logo.png" alt="Logo" className="w-24 h-auto drop-shadow-[0_0_16px_rgba(0,243,255,0.6)]" />
              <div>
                <div className="text-xl font-bold text-white leading-tight tracking-wide">Rongdhunu DOT Net</div>
                <div className="text-sm font-semibold tracking-widest uppercase" style={{ color: activeRole.color, transition: 'color 0.4s ease' }}>ISP Billing System</div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Welcome Back</h1>
              <p className="text-gray-400 text-sm">Sign in to your account to continue</p>
            </motion.div>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              {/* Role Selector */}
              <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2}>
                <label className="block mb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Role</label>
                <div className="relative">
                  <select
                    value={selectedRole}
                    onChange={(e) => { setSelectedRole(e.target.value); setRequire2FA(false); setError(null); }}
                    className="w-full p-3 pl-4 pr-10 appearance-none glass-input bg-slate-900/60 border border-white/10 rounded-xl text-white text-sm font-semibold focus:outline-none focus:ring-2 cursor-pointer transition-all"
                    style={{ borderColor: `${activeRole.color}40`, '--focus-color': activeRole.color } as React.CSSProperties}
                  >
                    {roles.map(r => <option key={r.id} value={r.id} className="bg-slate-800">{r.label}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  {/* Active role accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all duration-300" style={{ background: activeRole.color }} />
                </div>
              </motion.div>

              {/* Phone */}
              <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}>
                <label className="block mb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone / Username</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="text" name="phone" placeholder="Enter your phone or username" required
                    className="w-full p-3 pl-10 glass-input bg-slate-900/60 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-neon-blue/40 transition-all" />
                </div>
              </motion.div>

              {/* Password */}
              <AnimatePresence mode="wait">
                {!require2FA ? (
                  <motion.div key="password" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                    <label className="block mb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type={showPassword ? "text" : "password"} name="password" placeholder="Enter password" required
                        className="w-full p-3 pl-10 pr-12 glass-input bg-slate-900/60 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-neon-blue/40 transition-all" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="otp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                    <label className="block mb-1.5 text-xs font-semibold text-neon-blue uppercase tracking-wider">OTP Code (Sent via SMS)</label>
                    <input type="text" value={otpToken} onChange={(e) => setOtpToken(e.target.value)} placeholder="Enter 6-digit OTP" required
                      className="w-full p-3 glass-input bg-slate-900/60 border border-neon-blue/40 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-neon-blue/40 tracking-widest text-center text-lg" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Remember + Forgot */}
              <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="flex justify-between items-center">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input id="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-white/10 bg-slate-800 accent-neon-blue cursor-pointer" />
                  <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors select-none">Remember me</span>
                </label>
                <Link href="/login/forgot-password" className="text-sm font-semibold text-neon-blue hover:text-white transition-colors hover:underline">
                  Forgot password?
                </Link>
              </motion.div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 overflow-hidden">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5}>
                <button type="submit" disabled={loading}
                  className="w-full p-3.5 rounded-xl font-bold text-sm tracking-wider transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group"
                  style={{ background: `linear-gradient(135deg, ${activeRole.color}22, ${activeRole.color}44)`, border: `1px solid ${activeRole.color}60`, color: activeRole.color }}>
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(135deg, ${activeRole.color}55, ${activeRole.color}88)` }} />
                  <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                    {loading ? (<><Loader2 size={18} className="animate-spin" /> Processing...</>) : "Log In →"}
                  </span>
                </button>
              </motion.div>
            </form>
          </div>
        </motion.div>
      </motion.div>

      {/* Responsive CSS */}
      <style>{`
        @media (min-width: 768px) {
          .login-image-panel { display: block !important; }
        }
      `}</style>
    </div>
  );
}
