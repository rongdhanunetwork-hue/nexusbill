"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function EditAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [admin, setAdmin] = useState<{ name: string; phone: string; address: string | null; expireDate?: string | null; settings?: Record<string, string> } | null>(null);

  useEffect(() => {
    async function loadAdmin() {
      try {
        const res = await fetch(`/api/superadmin/admins?id=${id}`);
        if (!res.ok) {
          setError("Failed to load admin details.");
          setFetching(false);
          return;
        }
        const data = await res.json();
        setAdmin(data);
      } catch (err) {
        setError("An error occurred while loading admin details.");
      } finally {
        setFetching(false);
      }
    }
    loadAdmin();
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const address = String(form.get("address") || "").trim();
    const newPassword = String(form.get("newPassword") || "").trim();
    const validityDaysStr = String(form.get("validityDays") || "").trim();

    if (!name || !phone) {
      setError("Name and Phone number are required.");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload: any = { 
      id: Number(id), 
      name, 
      phone, 
      address, 
      newPassword: newPassword || undefined,
      subscriptionSettings: {
        sub_package: String(form.get("subPackage") || "").trim(),
        sub_package_rate: String(form.get("subPackageRate") || "").trim(),
        sub_customer_limit: String(form.get("subCustomerLimit") || "").trim(),
        sub_customer_type: String(form.get("subCustomerType") || "").trim(),
        sub_payment_status: String(form.get("subPaymentStatus") || "").trim(),
        sub_sms_rate_non_masking: String(form.get("subSmsRateNonMasking") || "").trim(),
        sub_sms_rate_fixed: String(form.get("subSmsRateFixed") || "").trim(),
        sub_sms_rate_masking: String(form.get("subSmsRateMasking") || "").trim(),
      }
    };
    if (validityDaysStr) {
      payload.validityDays = parseInt(validityDaysStr);
    }

    const res = await fetch("/api/superadmin/admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to update admin.");
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/superadmin/admins"), 1500);
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/superadmin/admins" className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.05)" }}>
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-white">Edit Admin</h1>
      </div>

      <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name *</label>
            <input name="name" required defaultValue={admin?.name || ""} placeholder="Admin full name"
              className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number *</label>
            <input name="phone" type="tel" required defaultValue={admin?.phone || ""} placeholder="01XXXXXXXXX"
              className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Address</label>
            <input name="address" defaultValue={admin?.address || ""} placeholder="Admin address (optional)"
              className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">New Account Validity (Days)</label>
            <input name="validityDays" type="number" min="0" placeholder="Leave blank to keep current validity"
              className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            {admin?.expireDate && (
               <p className="text-xs text-gray-400 mt-2">
                 Current Expiration: {new Date(admin.expireDate).toLocaleDateString()}
               </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">New Password (Leave blank to keep current)</label>
            <div className="relative">
              <input name="newPassword" type={showPwd ? "text" : "password"} minLength={6} placeholder="Min 6 characters"
                className="w-full px-4 py-2.5 pr-12 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 mt-6 space-y-4">
          <h2 className="text-lg font-bold text-white mb-4">Subscription & Parameters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Package Name</label>
              <input name="subPackage" defaultValue={admin?.settings?.sub_package || "P7 (Unlimited Super Admin)"} 
                className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Package Rate</label>
              <input name="subPackageRate" defaultValue={admin?.settings?.sub_package_rate || "৳2,000.00"} 
                className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Customer Limit</label>
              <input name="subCustomerLimit" defaultValue={admin?.settings?.sub_customer_limit || "1,000 Users"} 
                className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Customer Type</label>
              <input name="subCustomerType" defaultValue={admin?.settings?.sub_customer_type || "PPPoE / Static"} 
                className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Status</label>
              <input name="subPaymentStatus" defaultValue={admin?.settings?.sub_payment_status || "Paid"} 
                className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Non Masking SMS Rate</label>
              <input name="subSmsRateNonMasking" defaultValue={admin?.settings?.sub_sms_rate_non_masking || "৳0.30"} 
                className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fixed Number SMS Rate</label>
              <input name="subSmsRateFixed" defaultValue={admin?.settings?.sub_sms_rate_fixed || "৳0.45"} 
                className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Masking SMS Rate</label>
              <input name="subSmsRateMasking" defaultValue={admin?.settings?.sub_sms_rate_masking || "৳0.65"} 
                className="w-full px-4 py-2.5 text-sm text-white rounded-xl focus:outline-none placeholder-gray-600 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-400"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-green-400"
            style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
            <CheckCircle2 size={15} /> Admin updated successfully! Redirecting...
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading || success}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
            {loading ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><Save size={15} /> Save Changes</>}
          </button>
          <Link href="/superadmin/admins" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            Cancel
          </Link>
        </div>
      </motion.form>
    </div>
  );
}
