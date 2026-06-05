"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Shield, Globe, Phone, Loader2, CheckCircle2, Eye, EyeOff, MessageSquare, Clock, Send, AlertTriangle, Download } from "lucide-react";

interface SettingsMap {
  bkash_number?: string;
  bkash_number_2?: string;
  bank_card_number?: string;

  system_name?: string;
  website_logo?: string;
  sms_provider?: string;
  sms_api_key?: string;
  sms_sender_id?: string;
  sms_test_phone?: string;
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
  const [testSmsLoading, setTestSmsLoading] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<string | null>(null);
  const [cronLoading, setCronLoading] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);

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

  async function handleTestSMS() {
    const phone = settings.sms_test_phone;
    if (!phone) { setTestSmsResult("❌ Test phone number set করুন"); return; }
    setTestSmsLoading(true);
    setTestSmsResult(null);
    const res = await fetch("/api/admin/settings/test-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setTestSmsLoading(false);
    setTestSmsResult(data.success ? "✅ SMS সফলভাবে পাঠানো হয়েছে!" : `❌ Error: ${data.error}`);
  }

  async function handleRunCron() {
    setCronLoading(true);
    setCronResult(null);
    const secret = process.env.NEXT_PUBLIC_CRON_SECRET || "isp-cron-secret-2024";
    const res = await fetch(`/api/cron/expire-customers?secret=${secret}`);
    const data = await res.json();
    setCronLoading(false);
    if (data.success) {
      setCronResult(`✅ Expired: ${data.expired} customers | SMS sent: ${data.smsSent} | Reminders: ${data.reminders}`);
    } else {
      setCronResult(`❌ Error: ${data.error}`);
    }
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
              label="bKash Number 1"
              name="bkash_number"
              defaultValue={settings.bkash_number || ""}
              placeholder="e.g. 01712345678"
            />
            <Field
              label="bKash Number 2"
              name="bkash_number_2"
              defaultValue={settings.bkash_number_2 || ""}
              placeholder="e.g. 01712345678"
            />
            <Field
              label="Bank Card Number"
              name="bank_card_number"
              defaultValue={settings.bank_card_number || ""}
              placeholder="e.g. Dutch-Bangla Bank 123.456.7890"
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

        {/* SMS Configuration */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass-card p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-yellow-400" /> SMS Notification Settings
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">SMS Provider</label>
              <select
                name="sms_provider"
                value={settings.sms_provider || ""}
                onChange={(e) => setSettings({ ...settings, sms_provider: e.target.value })}
                className="w-full glass-input px-4 py-3 bg-slate-800 text-white"
              >
                <option value="" className="bg-slate-800">— Select Provider —</option>
                <option value="ssl_wireless" className="bg-slate-800">SSL Wireless</option>
                <option value="bdbulksms" className="bg-slate-800">BDBulkSMS</option>
              </select>
            </div>
            <Field
              label="Sender ID / Masking"
              name="sms_sender_id"
              defaultValue={settings.sms_sender_id || ""}
              placeholder="e.g. MYISP"
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">API Key / Token</label>
              <input
                type="password"
                name="sms_api_key"
                defaultValue={settings.sms_api_key || ""}
                placeholder="Your SMS provider API key"
                className="w-full glass-input px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Test Phone Number</label>
              <input
                type="text"
                value={settings.sms_test_phone || ""}
                onChange={(e) => setSettings({ ...settings, sms_test_phone: e.target.value })}
                placeholder="01700000000"
                className="w-full glass-input px-4 py-3"
              />
              <input type="hidden" name="sms_test_phone" value={settings.sms_test_phone || ""} />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleTestSMS}
                disabled={testSmsLoading}
                className="w-full px-4 py-3 rounded-xl bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-semibold hover:bg-yellow-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {testSmsLoading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send Test SMS</>}
              </button>
            </div>
          </div>
          {testSmsResult && (
            <p className={`text-sm px-4 py-2 rounded-lg border ${testSmsResult.startsWith("✅") ? "text-neon-green bg-neon-green/10 border-neon-green/20" : "text-red-400 bg-red-500/10 border-red-500/20"}`}>
              {testSmsResult}
            </p>
          )}
          <p className="text-xs text-gray-500">
            SMS পাঠানো হবে: payment approval, expiry reminder (৩ দিন আগে), expiry notification, এবং registration approval-এ।
          </p>
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

      {/* System Tools */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass-card p-6 md:p-8 space-y-6">
        <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-4 flex items-center gap-2">
          <Clock size={18} className="text-orange-400" /> System Tools
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-white mb-1">Manual Expiry Check</h3>
            <p className="text-xs text-gray-500 mb-3">এই বাটনটি চাপলে সব expired customer-এর status আপডেট হবে, MikroTik-এ disable হবে, এবং SMS যাবে। প্রতিদিন রাত ১২টায় স্বয়ংক্রিয়ভাবে চলবে।</p>
            <button
              type="button"
              onClick={handleRunCron}
              disabled={cronLoading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500/20 text-orange-300 border border-orange-500/30 font-semibold hover:bg-orange-500/30 transition disabled:opacity-50"
            >
              {cronLoading ? <><Loader2 size={18} className="animate-spin" /> Running...</> : <><AlertTriangle size={18} /> Run Expiry Check Now</>}
            </button>
            {cronResult && (
              <p className={`mt-3 text-sm px-4 py-2 rounded-lg border ${cronResult.startsWith("✅") ? "text-neon-green bg-neon-green/10 border-neon-green/20" : "text-red-400 bg-red-500/10 border-red-500/20"}`}>
                {cronResult}
              </p>
            )}
          </div>
          
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-sm font-medium text-white mb-1">Database Backup</h3>
            <p className="text-xs text-gray-500 mb-3">সম্পূর্ণ ডাটাবেসের (Customers, Packages, Inventory, Transactions) একটি JSON ব্যাকআপ ডাউনলোড করুন।</p>
            <a
              href="/api/admin/settings/backup"
              download
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/30 font-semibold hover:bg-neon-blue/30 transition"
            >
              <Download size={18} /> Download JSON Backup
            </a>
          </div>
        </div>
      </motion.div>

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
