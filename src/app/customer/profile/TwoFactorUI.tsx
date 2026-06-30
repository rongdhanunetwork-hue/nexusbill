"use client";

import { useState } from "react";
import { Shield, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  is2FAEnabled: boolean;
}

export default function TwoFactorUI({ is2FAEnabled }: Props) {
  const [enabled, setEnabled] = useState(is2FAEnabled);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secretText, setSecretText] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const startEnableProcess = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/profile/2fa");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQrUrl(data.qrUrl);
      setSecretText(data.secret);
    } catch (err: any) {
      setError(err.message || "Failed to initiate 2FA setup");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!token) return setError("Please enter the 6-digit OTP");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/profile/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable", token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSuccess("2FA Enabled successfully!");
      setEnabled(true);
      setQrUrl(null);
      setSecretText(null);
      setToken("");
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!token) return setError("Please enter the 6-digit OTP to confirm");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/profile/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSuccess("2FA Disabled successfully.");
      setEnabled(false);
      setShowDisableConfirm(false);
      setToken("");
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        {enabled ? <Shield className="text-neon-green" size={24} /> : <ShieldAlert className="text-orange-400" size={24} />}
        <h2 className="text-xl font-bold text-white tracking-wide">Two-Factor Authentication (2FA)</h2>
      </div>

      {success && (
        <div className="p-4 bg-neon-green/10 border border-neon-green/30 rounded-xl text-neon-green flex items-center gap-2 text-sm">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2 text-sm">
          <ShieldAlert size={16} /> {error}
        </div>
      )}

      {enabled ? (
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">Your account is secured with Two-Factor Authentication. You will need to enter an OTP from your authenticator app when logging in.</p>
          
          {!showDisableConfirm ? (
            <button
              onClick={() => { setShowDisableConfirm(true); setSuccess(null); setError(null); }}
              className="px-6 py-2.5 bg-red-500/20 text-red-400 font-semibold rounded-xl hover:bg-red-500/30 transition border border-red-500/30"
            >
              Disable 2FA
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-4 bg-slate-900 rounded-xl border border-white/10 space-y-4">
              <p className="text-sm text-gray-400">To disable 2FA, please enter the current OTP from your Authenticator app.</p>
              <input
                type="text"
                placeholder="6-digit OTP"
                value={token}
                onChange={e => setToken(e.target.value)}
                className="w-full glass-input px-4 py-2"
                maxLength={6}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDisableConfirm(false); setToken(""); }}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={disable2FA}
                  disabled={loading}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />} Confirm Disable
                </button>
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">Enhance your account security by enabling Two-Factor Authentication. Use an app like Google Authenticator or Authy.</p>
          
          {!qrUrl ? (
            <button
              onClick={startEnableProcess}
              disabled={loading}
              className="px-6 py-2.5 bg-neon-blue/20 text-neon-blue font-semibold rounded-xl hover:bg-neon-blue/30 transition border border-neon-blue/30 flex items-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />} Setup 2FA
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 bg-slate-900 rounded-2xl border border-white/10 space-y-6">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="p-4 bg-white rounded-xl shadow-lg shrink-0">
                  <img src={qrUrl} alt="2FA QR Code" className="w-40 h-40 object-contain" />
                </div>
                <div className="space-y-3 flex-1 min-w-0">
                  <h3 className="text-white font-bold">1. Scan the QR Code</h3>
                  <p className="text-sm text-gray-400">Open your authenticator app and scan the QR code. Or enter the secret key manually:</p>
                  <code className="block bg-black/50 p-3 rounded text-neon-blue font-mono text-center tracking-widest break-all">{secretText}</code>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <h3 className="text-white font-bold">2. Verify OTP</h3>
                <p className="text-sm text-gray-400">Enter the 6-digit code generated by your app to verify setup.</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="123456"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    className="flex-1 min-w-0 glass-input px-4 py-3 text-center tracking-widest text-lg"
                    maxLength={6}
                  />
                  <button
                    onClick={verifyAndEnable}
                    disabled={loading}
                    className="px-4 sm:px-8 bg-neon-green/20 hover:bg-neon-green/30 text-neon-green font-bold rounded-xl border border-neon-green/30 transition flex items-center justify-center shrink-0 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : "Verify"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
