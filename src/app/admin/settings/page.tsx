"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Shield, Globe, Phone, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

interface SettingsMap {
  bkash_number?: string;
  nagad_number?: string;
  rocket_number?: string;
  system_name?: string;
  website_logo?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedPwd, setSavedPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => { setSettings(data); setLoading(false); });
  }, []);

  async function handleSaveGeneral(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    for (const [k, v] of form.entries()) {
      data[k] = String(v);
    }
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

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
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={40} className="animate-spin text-neon-blue" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-white tracking-wide">Admin Settings</h1>

      {/* Payment Numbers */}
      <form onSubmit={handleSaveGeneral} className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-4 flex items-center gap-2">
            <Phone size={18} className="text-neon-green" /> Payment Numbers
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Field
              label="bKash Personal Number"
              name="bkash_number"
              defaultValue={settings.bkash_number || ""}
              placeholder="e.g. 01712345678"
            />
            <Field
              label="Nagad Number"
              name="nagad_number"
              defaultValue={settings.nagad_number || ""}
              placeholder="e.g. 01812345678"
            />
            <Field
              label="Rocket Number"
              name="rocket_number"
              defaultValue={settings.rocket_number || ""}
              placeholder="e.g. 01912345678"
            />
          </div>
          <p className="text-xs text-gray-500">
            এই নম্বরগুলো Customer Pay Bill পেজে দেখাবে।
          </p>
        </motion.div>

        {/* Branding */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-4 flex items-center gap-2">
            <Globe size={18} className="text-neon-blue" /> Website / Branding
          </h2>
          <Field
            label="System Name"
            name="system_name"
            defaultValue={settings.system_name || "NexusBill ISP"}
            placeholder="e.g. My ISP Name"
          />
          <Field
            label="Website Logo URL"
            name="website_logo"
            defaultValue={settings.website_logo || ""}
            placeholder="https://example.com/logo.png"
          />
        </motion.div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/30 font-semibold text-base hover:bg-neon-blue/30 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 size={18} className="animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle2 size={18} className="text-neon-green" /> Saved!</>
          ) : (
            <><Save size={18} /> Save Settings</>
          )}
        </button>
      </form>

      {/* Change Password */}
      <form onSubmit={handleChangePassword}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-4 flex items-center gap-2">
            <Shield size={18} className="text-purple-400" /> Change Admin Password
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
                  className="w-full glass-input px-4 py-3 pr-12"
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
                  className="w-full glass-input px-4 py-3 pr-12"
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

function Field({ label, name, defaultValue, placeholder }: { label: string; name: string; defaultValue: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full glass-input px-4 py-3"
      />
    </div>
  );
}
