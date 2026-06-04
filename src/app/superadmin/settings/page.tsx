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

  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      
      setSystemName(data.system_name || "NexusBill ISP");
      setAdminEmail(data.admin_email || "admin@nexusbill.com");
      setAdminSignature(data.admin_signature || "NexusBill Team");
      setCompanyLogo(data.company_logo || "");
      setBkashNumber(data.bkash_number || "");
      setBkashNumber2(data.bkash_number_2 || "");
      setNagadNumber(data.nagad_number || "");
      setRocketNumber(data.rocket_number || "");
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
