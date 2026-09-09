"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Loader2, CheckCircle2, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SuperAdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings state
  const [systemName, setSystemName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminSignature, setAdminSignature] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  
  // Payment numbers
  const [bkashNumber, setBkashNumber] = useState("");
  const [bkashNumber2, setBkashNumber2] = useState("");
  const [nagadNumber, setNagadNumber] = useState("");
  const [rocketNumber, setRocketNumber] = useState("");

  // bKash API Setup
  const [bkashAppKey, setBkashAppKey] = useState("");
  const [bkashAppSecret, setBkashAppSecret] = useState("");
  const [bkashUsername, setBkashUsername] = useState("");
  const [bkashPassword, setBkashPassword] = useState("");
  const [bkashBaseUrl, setBkashBaseUrl] = useState("");

  // SMS Gateway Setup
  const [smsGatewayUrl, setSmsGatewayUrl] = useState("");
  const [smsApiKey, setSmsApiKey] = useState("");
  const [smsSenderId, setSmsSenderId] = useState("");

  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      
      setSystemName(data.system_name || "Rongdhunu DOT Net");
      setAdminEmail(data.admin_email || "admin@Rongdhunu DOT Net.com");
      setAdminSignature(data.admin_signature || "Rongdhunu DOT Net Team");
      setCompanyLogo(data.company_logo || "");
      setBkashNumber(data.bkash_number || "");
      setBkashNumber2(data.bkash_number_2 || "");
      setNagadNumber(data.nagad_number || "");
      setRocketNumber(data.rocket_number || "");
      
      setBkashAppKey(data.bkash_app_key || "");
      setBkashAppSecret(data.bkash_app_secret || "");
      setBkashUsername(data.bkash_username || "");
      setBkashPassword(data.bkash_password || "");
      setBkashBaseUrl(data.bkash_base_url || "");

      setSmsGatewayUrl(data.sms_gateway_url || "");
      setSmsApiKey(data.sms_api_key || "");
      setSmsSenderId(data.sms_sender_id || "");
    } catch (err) {
      console.error(err);
      setError("Failed to load global settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSettings(); }, []);

  async function handleFileUpload(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/superadmin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_name: systemName,
          admin_email: adminEmail,
          admin_signature: adminSignature,
          company_logo: companyLogo,
          bkash_number: bkashNumber,
          bkash_number_2: bkashNumber2,
          nagad_number: nagadNumber,
          rocket_number: rocketNumber,
          
          bkash_app_key: bkashAppKey,
          bkash_app_secret: bkashAppSecret,
          bkash_username: bkashUsername,
          bkash_password: bkashPassword,
          bkash_base_url: bkashBaseUrl,

          sms_gateway_url: smsGatewayUrl,
          sms_api_key: smsApiKey,
          sms_sender_id: smsSenderId,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (err) {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <Settings size={24} style={{ color: "#fbbf24" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-sm text-gray-400">Configure global parameters and payment gate coordinates</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6 items-start">
        {/* Left column: Branding & Details */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-base font-bold text-white border-b border-white/5 pb-2">Branding & Identity</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">System / Company Name</label>
              <input value={systemName} onChange={e => setSystemName(e.target.value)} required
                className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Company Logo</label>
              <div className="flex gap-4 items-center">
                {companyLogo && (
                  <img src={companyLogo} alt="Logo" className="w-12 h-12 object-cover rounded-xl bg-white/10 border border-white/10" />
                )}
                <input type="file" accept="image/*"
                  onChange={async e => {
                    if (e.target.files?.[0]) {
                      setUploadingLogo(true);
                      const url = await handleFileUpload(e.target.files[0]);
                      if (url) setCompanyLogo(url);
                      setUploadingLogo(false);
                    }
                  }}
                  className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-yellow-500/20 file:text-yellow-300 hover:file:bg-yellow-500/30" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Admin Contact Email</label>
              <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required
                className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Admin Signature Text</label>
              <input value={adminSignature} onChange={e => setAdminSignature(e.target.value)} required
                className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
          </div>
        </div>

        {/* Right column: Payment coordinates */}
        <div className="space-y-6">
          <div className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 className="text-base font-bold text-white border-b border-white/5 pb-2">Payment Gateways</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">bKash Number 1</label>
                <input value={bkashNumber} onChange={e => setBkashNumber(e.target.value)} placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">bKash Number 2</label>
                <input value={bkashNumber2} onChange={e => setBkashNumber2(e.target.value)} placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nagad Personal/Merchant Number</label>
                <input value={nagadNumber} onChange={e => setNagadNumber(e.target.value)} placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Rocket Personal Number</label>
                <input value={rocketNumber} onChange={e => setRocketNumber(e.target.value)} placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 className="text-base font-bold text-white border-b border-white/5 pb-2">bKash Payment API (Automation)</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">bKash App Key</label>
                <input value={bkashAppKey} onChange={e => setBkashAppKey(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">bKash App Secret</label>
                <input value={bkashAppSecret} onChange={e => setBkashAppSecret(e.target.value)} type="password"
                  className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">bKash API Username</label>
                <input value={bkashUsername} onChange={e => setBkashUsername(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">bKash API Password</label>
                <input value={bkashPassword} onChange={e => setBkashPassword(e.target.value)} type="password"
                  className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">bKash Base URL</label>
                <input value={bkashBaseUrl} onChange={e => setBkashBaseUrl(e.target.value)} placeholder="https://tokenized.sandbox.bka.sh/v1.2.0-beta"
                  className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 className="text-base font-bold text-white border-b border-white/5 pb-2">SMS Gateway Configuration</h2>
            <div className="text-xs text-gray-400 mb-2">Select a provider preset or write a custom URL with [TO] and [MESSAGE] placeholders.</div>

            {/* Provider Quick Presets */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button type="button" onClick={() => setSmsGatewayUrl("https://api.greenweb.com.bd/api.php?token=[API_KEY]&to=[TO]&message=[MESSAGE]")}
                className="px-2.5 py-1 text-xs rounded-lg font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition">
                + GreenWeb BD
              </button>
              <button type="button" onClick={() => setSmsGatewayUrl("https://api.bdbulksms.net/api.php?token=[API_KEY]&to=[TO]&message=[MESSAGE]")}
                className="px-2.5 py-1 text-xs rounded-lg font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition">
                + BDBulkSMS
              </button>
              <button type="button" onClick={() => setSmsGatewayUrl("https://smsplus.sslwireless.com/api/v3/send-sms?api_token=[API_KEY]&sid=[SENDER_ID]&msisdn=[TO]&sms=[MESSAGE]")}
                className="px-2.5 py-1 text-xs rounded-lg font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition">
                + SSL Wireless
              </button>
              <button type="button" onClick={() => setSmsGatewayUrl("https://api.elitbuzz-bd.com/smsapi?api_key=[API_KEY]&type=text&contacts=[TO]&senderid=[SENDER_ID]&msg=[MESSAGE]")}
                className="px-2.5 py-1 text-xs rounded-lg font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition">
                + Elitbuzz
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Gateway API URL</label>
                <input value={smsGatewayUrl} onChange={e => setSmsGatewayUrl(e.target.value)} placeholder="https://api.sms.com/send?to=[TO]&msg=[MESSAGE]&apikey=[API_KEY]"
                  className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">API Key (Replaces [API_KEY])</label>
                <input value={smsApiKey} onChange={e => setSmsApiKey(e.target.value)} placeholder="Enter API Key / Token"
                  className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sender ID (Replaces [SENDER_ID])</label>
                <input value={smsSenderId} onChange={e => setSmsSenderId(e.target.value)} placeholder="8809648906893"
                  className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400 rounded-xl">
                {error}
              </div>
            )}

            <AnimatePresence>
              {saved && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-3 bg-green-500/10 border border-green-500/20 text-xs text-green-400 rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={14} /> Settings updated successfully!
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={saving || uploadingLogo}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Settings</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
