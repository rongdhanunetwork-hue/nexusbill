"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import {
  User,
  Settings as SettingsIcon,
  ShieldAlert,
  QrCode,
  Save,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  Calendar,
  Lock,
  Globe,
  Plus
} from "lucide-react";

interface AdminUser {
  id: number;
  name: string;
  phone: string;
  photoUrl: string | null;
  address: string | null;
  createdAt: string | null;
}

interface Props {
  adminUser: AdminUser;
  totalCustomers: number;
  initialSettings: Record<string, string>;
}

const CONTROL_PANEL_FEATURES = [
  "Customer Id Auto Generate",
  "Update Customer Balance",
  "Mikrotik Delete",
  "Promise Date",
  "Report Delete",
  "Expenditure Delete",
  "Bulk Area Edit",
  "Bulk Status Edit",
  "Bulk BillingCycle Edit",
  "Bulk Promise Date Edit",
  "Bulk Auto Disable Edit",
  "Bulk Package Edit",
  "Bulk Transfer To Reseller",
  "Bulk Customer Delete",
  "Bulk Customer Mikrotik Update",
  "Customer Auto Connection",
  "Bulk Customer Recharge",
  "Add Customer with Mobile",
  "Instant Recharge Bill Print",
  "In-Active/Offline Customer Delete",
  "Reseller Add",
  "Multiple Manager",
  "Reseller Customer Bulk Status Edit",
  "Reseller Customer Bulk Promise Date Edit"
];

export default function ProfileClient({ adminUser, totalCustomers, initialSettings }: Props) {
  const [activeTab, setActiveTab] = useState<"settings" | "profile" | "control_panel" | "qr_code">("profile");
  const [profileName, setProfileName] = useState(adminUser.name);
  const [companyName, setCompanyName] = useState(initialSettings.system_name || "Rongdhunu DOT Net");
  const [email, setEmail] = useState(initialSettings.admin_email || "admin@Rongdhunu DOT Net.com");
  const [phone, setPhone] = useState(adminUser.phone);
  const [photoUrl, setPhotoUrl] = useState(adminUser.photoUrl || "");
  const [companyLogo, setCompanyLogo] = useState(initialSettings.company_logo || "");
  const [address, setAddress] = useState(adminUser.address || "");
  const [signature, setSignature] = useState(initialSettings.admin_signature || "Rongdhunu DOT Net Team");
  
  // Dynamic subscription settings
  const [subPackage, setSubPackage] = useState(initialSettings.sub_package || "P7 (Unlimited Super Admin)");
  const [subPackageRate, setSubPackageRate] = useState(initialSettings.sub_package_rate || "৳2,000.00");
  const [subCustomerLimit, setSubCustomerLimit] = useState(initialSettings.sub_customer_limit || "1,000 Users");
  const [subCustomerType, setSubCustomerType] = useState(initialSettings.sub_customer_type || "PPPoE / Static");
  const [subPaymentStatus, setSubPaymentStatus] = useState(initialSettings.sub_payment_status || "Paid");
  const [subSmsRateNonMasking, setSubSmsRateNonMasking] = useState(initialSettings.sub_sms_rate_non_masking || "৳0.30");
  const [subSmsRateFixed, setSubSmsRateFixed] = useState(initialSettings.sub_sms_rate_fixed || "৳0.45");
  const [subSmsRateMasking, setSubSmsRateMasking] = useState(initialSettings.sub_sms_rate_masking || "৳0.65");
  
  const [uploadingImage, setUploadingImage] = useState(false);

  // Control Panel Permissions state
  const [permissions, setPermissions] = useState<string[]>(() => {
    try {
      return JSON.parse(initialSettings.control_panel_permissions || "[]");
    } catch {
      return [];
    }
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${companyName}
ORG:${companyName}
TEL;TYPE=WORK,VOICE:${phone}
EMAIL;TYPE=PREF,INTERNET:${email}
ADR;TYPE=WORK:;;${address || ""};;;;
URL:https://rdnisp.com
${companyLogo ? `PHOTO;VALUE=uri:${companyLogo}\n` : ""}NOTE:Admin: ${profileName}
END:VCARD`;

    QRCode.toDataURL(vcard, {
      width: 256,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => setQrCodeUrl(url))
      .catch(console.error);
  }, [companyName, phone, email, address, profileName]);

  async function handleFileUpload(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url;
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      // Save global settings
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_name: companyName,
          admin_email: email,
          admin_signature: signature,
          company_logo: companyLogo,
        }),
      });

      // Save user profile details
      const userRes = await fetch("/api/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          phone,
          photoUrl,
        }),
      });

      if (userRes.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveControlPanel() {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          control_panel_permissions: JSON.stringify(permissions),
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError("Passwords do not match.");
      return;
    }

    setSavingPwd(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      if (res.ok) {
        setPwdSuccess("Password changed successfully!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        setPwdError(data.error || "Failed to change password.");
      }
    } catch {
      setPwdError("Network error.");
    } finally {
      setSavingPwd(false);
    }
  }

  function togglePermission(perm: string) {
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter((p) => p !== perm));
    } else {
      setPermissions([...permissions, perm]);
    }
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/30 flex items-center justify-center">
          <User size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">{companyName}</h1>
          <p className="text-xs text-gray-400 mt-1">Admin Profile & System Settings Control Panel</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2.5 border-b border-white/10 pb-4">
        {[
          { id: "profile", label: "Profile", icon: User },
          { id: "settings", label: "Settings", icon: SettingsIcon },
          { id: "control_panel", label: "Control Panel", icon: ShieldAlert },
          { id: "qr_code", label: "QR Code", icon: QrCode },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
              activeTab === tab.id
                ? "bg-neon-blue/15 text-neon-blue border-neon-blue/30 shadow-[inset_0_0_20px_rgba(0,243,255,0.05)]"
                : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="w-full"
        >
          {activeTab === "profile" && (
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Profile Details List */}
              <div className="glass-card p-6 md:p-8 space-y-6">
                <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
                  <Building className="text-neon-blue" size={18} /> Company Profile
                </h2>
                <div className="space-y-4">
                  <DetailItem label="Admin ID" value={String(adminUser.id)} />
                  <DetailItem label="Company" value={companyName} />
                  <DetailItem label="Name" value={profileName} />
                  <DetailItem label="Mobile" value={phone} />
                  <DetailItem label="E-mail" value={email} />
                  <DetailItem label="Address" value={address || "Not Configured"} />
                  <DetailItem label="Created At" value={adminUser.createdAt ? new Date(adminUser.createdAt).toLocaleDateString() : "N/A"} />
                </div>
              </div>

              {/* Extra System Stats details */}
              <div className="glass-card p-6 md:p-8 space-y-6">
                <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
                  <ShieldCheck className="text-neon-green" size={18} /> Subscription & Parameters
                </h2>
                <div className="space-y-4">
                  <DetailItem label="Package" value={subPackage} />
                  <DetailItem label="Package Rate" value={subPackageRate} />
                  <DetailItem label="Customer Limit" value={subCustomerLimit} />
                  <DetailItem label="Total Customer" value={`${totalCustomers} Users`} />
                  <DetailItem label="Customer Type" value={subCustomerType} />
                  <DetailItem label="Payment status" value={subPaymentStatus} badge="bg-neon-green/20 text-neon-green border-neon-green/30" />
                  <DetailItem label="Non Masking SMS Rate" value={subSmsRateNonMasking} />
                  <DetailItem label="Fixed Number SMS Rate" value={subSmsRateFixed} />
                  <DetailItem label="Masking SMS Rate" value={subSmsRateMasking} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Profile settings form */}
              <form onSubmit={handleSaveSettings} className="glass-card p-6 md:p-8 space-y-6">
                <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
                  <SettingsIcon className="text-neon-blue" size={18} /> Update Profile
                </h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full glass-input px-4 py-3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Company / System Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full glass-input px-4 py-3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Company Logo</label>
                    <div className="flex gap-4 items-center">
                      {companyLogo && (
                        <img src={companyLogo} alt="Logo" className="w-12 h-12 object-cover rounded bg-white/10" />
                      )}
                      <input
                        type="file"
                        id="company-logo-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            setUploadingImage(true);
                            const url = await handleFileUpload(e.target.files[0]);
                            if (url) setCompanyLogo(url);
                            setUploadingImage(false);
                          }
                        }}
                      />
                      <label 
                        htmlFor="company-logo-upload"
                        className="cursor-pointer px-4 py-2 rounded-xl text-sm font-semibold bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30 transition-all text-center flex-1"
                      >
                        {uploadingImage ? "Uploading..." : "Choose File"}
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Mobile Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full glass-input px-4 py-3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Profile Image</label>
                    <div className="flex gap-4 items-center">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover bg-white/10" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-neon-blue to-purple-500 flex items-center justify-center text-white font-bold shrink-0 text-xl">
                          {profileName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <input
                        type="file"
                        id="profile-image-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            setUploadingImage(true);
                            const url = await handleFileUpload(e.target.files[0]);
                            if (url) setPhotoUrl(url);
                            setUploadingImage(false);
                          }
                        }}
                      />
                      <label 
                        htmlFor="profile-image-upload"
                        className="cursor-pointer px-4 py-2 rounded-xl text-sm font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-all text-center flex-1"
                      >
                        {uploadingImage ? "Uploading..." : "Choose File"}
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">E-mail Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full glass-input px-4 py-3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Signature</label>
                    <input
                      type="text"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      className="w-full glass-input px-4 py-3"
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {saved && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-neon-green/10 border border-neon-green/20 text-xs text-neon-green rounded-xl flex items-center gap-2"
                    >
                      <CheckCircle2 size={14} /> Profile details saved successfully!
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={saving || uploadingImage}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/30 font-semibold hover:bg-neon-blue/30 transition disabled:opacity-50"
                >
                  {(saving || uploadingImage) ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Update Profile
                </button>
              </form>

              {/* Password change form */}
              <form onSubmit={handleChangePassword} className="glass-card p-6 md:p-8 space-y-6">
                <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
                  <Lock className="text-purple-400" size={18} /> Change Password
                </h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Old Password</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full glass-input px-4 py-3"
                      placeholder="Enter old password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full glass-input px-4 py-3"
                      placeholder="Min 6 characters"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full glass-input px-4 py-3"
                      placeholder="Repeat new password"
                      required
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {pwdError && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400 rounded-xl"
                    >
                      {pwdError}
                    </motion.div>
                  )}
                  {pwdSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-neon-green/10 border border-neon-green/20 text-xs text-neon-green rounded-xl"
                    >
                      {pwdSuccess}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={savingPwd}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold hover:bg-purple-500/30 transition disabled:opacity-50"
                >
                  {savingPwd ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  Update Password
                </button>
              </form>
            </div>
          )}

          {activeTab === "control_panel" && (
            <div className="glass-card p-6 md:p-8 space-y-6">
              <div className="border-b border-white/10 pb-4 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="text-yellow-400" size={18} /> Feature Controls & Access Panel
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">সফ্টওয়্যারে কোন কোন ফিচার ও অ্যাক্সেস কন্ট্রোল সক্রিয় থাকবে তা এখান থেকে নির্ধারণ করুন।</p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveControlPanel}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/45 font-semibold hover:bg-neon-green/30 transition disabled:opacity-50 text-sm"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Settings
                </button>
              </div>

              {/* Permissions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {CONTROL_PANEL_FEATURES.map((feat) => {
                  const isChecked = permissions.includes(feat);
                  return (
                    <div
                      key={feat}
                      onClick={() => togglePermission(feat)}
                      className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer select-none transition-all ${
                        isChecked
                          ? "bg-neon-blue/10 border-neon-blue/40 text-white shadow-[inset_0_0_20px_rgba(0,243,255,0.03)]"
                          : "bg-slate-900/30 border-white/5 text-gray-400 hover:border-white/10 hover:text-white"
                      }`}
                    >
                      <span className="text-xs font-semibold">{feat}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="rounded bg-slate-900 border-white/10 text-neon-blue focus:ring-0 shrink-0 pointer-events-none"
                      />
                    </div>
                  );
                })}
              </div>

              <AnimatePresence>
                {saved && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-neon-green/10 border border-neon-green/20 text-xs text-neon-green rounded-xl flex items-center gap-2"
                  >
                    <CheckCircle2 size={14} /> Control Panel feature states updated and saved globally!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === "qr_code" && (
            <div className="glass-card p-8 text-center max-w-sm mx-auto space-y-6 border border-white/10">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2">
                <QrCode className="text-neon-blue" size={18} /> Company QR Code
              </h2>
              <div className="bg-white p-4 rounded-2xl w-fit mx-auto border-4 border-neon-blue/40 shadow-2xl">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Company QR Code" className="w-48 h-48 object-contain" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <Loader2 className="animate-spin text-neon-blue" size={32} />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">{companyName}</p>
                <p className="text-xs text-gray-400">ID: {adminUser.id}</p>
              </div>
              <p className="text-[11px] text-gray-500 leading-normal">
                Scan this QR code to quickly share subscription parameters, company profiles, or support portal configurations.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DetailItem({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div className="flex justify-between items-center border-b border-white/5 pb-2 text-sm">
      <span className="text-gray-400 font-medium">{label}</span>
      {badge ? (
        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${badge}`}>{value}</span>
      ) : (
        <span className="text-white font-semibold">{value}</span>
      )}
    </div>
  );
}
