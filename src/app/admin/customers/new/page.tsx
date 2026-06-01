"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, Upload } from "lucide-react";

interface Package {
  id: number;
  name: string;
  speed: string;
  price: string;
  durationDays: number;
}

interface MikroTik {
  id: number;
  name: string;
  ipAddress: string;
}

function getAreaLabel(item: any, list: any[]): string {
  if (item.type === "area") return `📍 ${item.name}`;
  if (item.type === "subarea") {
    const parent = list.find(a => a.id === item.parentId);
    return parent ? `📍 ${parent.name} ➔ 🧭 ${item.name}` : `🧭 ${item.name}`;
  }
  if (item.type === "polebox") {
    const parentSub = list.find(a => a.id === item.parentId);
    if (parentSub) {
      const parentArea = list.find(a => a.id === parentSub.parentId);
      return parentArea
        ? `📍 ${parentArea.name} ➔ 🧭 ${parentSub.name} ➔ 📦 ${item.name}`
        : `🧭 ${parentSub.name} ➔ 📦 ${item.name}`;
    }
    return `📦 ${item.name}`;
  }
  return item.name;
}

export default function AddCustomerPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [routers, setRouters] = useState<MikroTik[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);

  useEffect(() => {
    fetch("/api/admin/packages").then(r => r.json()).then(setPackages);
    // Inline fetch routers from DB via a small API
    fetch("/api/admin/mikrotik/routers").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setRouters(data);
    }).catch(() => {});
    fetch("/api/admin/areas").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setAreas(data);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const body = {
      name: String(form.get("name") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      password: String(form.get("password") || "").trim(),
      address: String(form.get("address") || "").trim(),
      pppoeUsername: String(form.get("pppoeUsername") || "").trim(),
      packageId: form.get("packageId") ? Number(form.get("packageId")) : null,
      mikrotikId: form.get("mikrotikId") ? Number(form.get("mikrotikId")) : null,
      photoUrl: String(form.get("photoUrl") || "").trim(),
      nidUrl: String(form.get("nidUrl") || "").trim(),
      nidNumber: String(form.get("nidNumber") || "").trim(),
      macAddress: String(form.get("macAddress") || "").trim(),
      createdAt: form.get("createdAt") ? String(form.get("createdAt")) : null,
      expireDate: form.get("expireDate") ? String(form.get("expireDate")) : null,
      dob: form.get("dob") ? String(form.get("dob")) : null,
      areaId: form.get("areaId") ? Number(form.get("areaId")) : null,
      customerType: String(form.get("customerType") || "pppoe"),
      connectionFee: String(form.get("connectionFee") || "0"),
      promiseDate: form.get("promiseDate") ? String(form.get("promiseDate")) : null,
      note: String(form.get("note") || "").trim(),
      autoRenew: autoRenew,
    };

    if (!body.password || body.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create customer.");
    } else {
      router.push("/admin/customers");
      router.refresh();
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/customers" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-wide">Add Customer</h1>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 md:p-8 space-y-8"
      >
        {/* Profile */}
        <section>
          <h3 className="text-lg font-semibold text-white mb-5 pb-3 border-b border-white/10">Customer Profile</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Full Name *" name="name" required placeholder="Customer full name" />
            <Field label="Phone Number *" name="phone" required placeholder="01XXXXXXXXX" type="tel" />
            <Field label="NID Number" name="nidNumber" placeholder="NID Number" />
            <Field label="Date of Birth (জন্ম তারিখ)" name="dob" type="date" />
            <div className="md:col-span-2">
              <Field label="Address" name="address" placeholder="Full address" />
            </div>
            <ImageUploadField label="Customer Photo" name="photoUrl" />
            <ImageUploadField label="NID Document Upload" name="nidUrl" />
          </div>
        </section>

        {/* Connection */}
        <section>
          <h3 className="text-lg font-semibold text-white mb-5 pb-3 border-b border-white/10">Connection & Billing</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="PPPoE Username" name="pppoeUsername" placeholder="pppoe_username" />
            <Field label="MAC Address" name="macAddress" placeholder="AA:BB:CC:DD:EE:FF" />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Package</label>
              <select name="packageId" className="w-full glass-input px-4 py-3 bg-slate-800">
                <option value="" className="bg-slate-800">Select package</option>
                {packages.map(pkg => (
                  <option key={pkg.id} value={pkg.id} className="bg-slate-800">
                    {pkg.name} ({pkg.speed} — ৳{pkg.price}/mo)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">MikroTik Router</label>
              <select name="mikrotikId" className="w-full glass-input px-4 py-3 bg-slate-800">
                <option value="" className="bg-slate-800">No router assigned</option>
                {routers.map(r => (
                  <option key={r.id} value={r.id} className="bg-slate-800">
                    {r.name} ({r.ipAddress})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Customer Connection Type</label>
              <select name="customerType" className="w-full glass-input px-4 py-3 bg-slate-800">
                <option value="pppoe" className="bg-slate-800">PPPoE Connection</option>
                <option value="static" className="bg-slate-800">Static IP Connection</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Assign Area / Pole Box</label>
              <select name="areaId" className="w-full glass-input px-4 py-3 bg-slate-800">
                <option value="" className="bg-slate-800">No area assigned</option>
                {areas.map(item => (
                  <option key={item.id} value={item.id} className="bg-slate-800">
                    {getAreaLabel(item, areas)}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Connection Fee (৳)" name="connectionFee" placeholder="0" type="number" />
            <Field label="Promise Date" name="promiseDate" type="date" />
            <Field label="Profile Creation Date" name="createdAt" type="date" />
            <Field label="Expiration Date & Time (Expiry)" name="expireDate" type="datetime-local" />
            <div className="md:col-span-2">
              <Field label="Customer Remarks / Notes" name="note" placeholder="Any remarks or special instructions" />
            </div>
            <div className="md:col-span-2 flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
              <input
                type="checkbox"
                id="autoRenew"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="w-5 h-5 accent-neon-blue rounded cursor-pointer"
              />
              <label htmlFor="autoRenew" className="text-sm font-semibold text-gray-300 cursor-pointer">
                Auto Renew (অটো রিচার্জ) <span className="text-xs text-gray-500 font-normal ml-1">- If checked, account will be auto-recharged based on available balance</span>
              </label>
            </div>
          </div>
        </section>

        {/* Password */}
        <section>
          <h3 className="text-lg font-semibold text-white mb-5 pb-3 border-b border-white/10">Login Credentials</h3>
          <div className="max-w-sm">
            <label className="block text-sm font-medium text-gray-300 mb-2">Password *</label>
            <div className="relative">
              <input
                name="password"
                type={showPwd ? "text" : "password"}
                required
                minLength={6}
                placeholder="Min 6 characters"
                className="w-full glass-input px-4 py-3 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/40 font-semibold hover:bg-neon-blue/30 transition-colors disabled:opacity-50"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Save size={18} /> Save Customer</>}
          </button>
          <Link href="/admin/customers" className="px-7 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-colors">
            Cancel
          </Link>
        </div>
      </motion.form>
    </div>
  );
}

function Field({ label, name, required, placeholder, type = "text" }: {
  label: string; name: string; required?: boolean; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full glass-input px-4 py-3 bg-slate-800"
      />
    </div>
  );
}

function ImageUploadField({ label, name, defaultValue, onChange }: { label: string; name: string; defaultValue?: string; onChange?: (val: string) => void }) {
  const [value, setValue] = useState(defaultValue || "");
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setValue(data.url);
        if (onChange) onChange(data.url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="flex gap-3 items-center">
        <input type="hidden" name={name} value={value} />
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id={`file-upload-${name}`}
        />
        <label
          htmlFor={`file-upload-${name}`}
          className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-gray-300 font-semibold cursor-pointer flex items-center gap-2"
        >
          {uploading ? <Loader2 size={16} className="animate-spin text-neon-blue" /> : <Upload size={16} />} Select Image
        </label>
        {value && (
          <div className="flex items-center gap-2">
            <img src={value} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-white/10" />
            <span className="text-xs text-gray-400 truncate max-w-40">{value.split("/").pop()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

