"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Compass, AlertCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { BD_LOCATIONS } from "@/lib/bd-locations";
import ImageUploadField from "@/components/ui/ImageUploadField";

interface Package {
  id: number;
  name: string;
  speed: string;
  price: string;
  durationDays: number;
}

interface RouterPop {
  id: number;
  name: string;
}

interface AreaZone {
  id: number;
  name: string;
  type: string;
}

interface OltTjBox {
  id: number;
  name: string;
}

export default function AddCustomerPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [routers, setRouters] = useState<RouterPop[]>([]);
  const [zones, setZones] = useState<AreaZone[]>([]);
  const [olts, setOlts] = useState<OltTjBox[]>([]);
  const [tjBoxes, setTjBoxes] = useState<OltTjBox[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic values
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [fetchingGps, setFetchingGps] = useState(false);
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");

  useEffect(() => {
    fetch("/api/admin/packages").then(r => r.json()).then(setPackages).catch(() => {});
    fetch("/api/admin/mikrotik/routers").then(r => r.json()).then(data => { if (Array.isArray(data)) setRouters(data); }).catch(() => {});
    fetch("/api/admin/areas").then(r => r.json()).then(data => { if (Array.isArray(data)) setZones(data); }).catch(() => {});
    fetch("/api/admin/olts").then(r => r.json()).then(data => { if (Array.isArray(data)) setOlts(data); }).catch(() => {});
    fetch("/api/admin/tj-boxes").then(r => r.json()).then(data => { if (Array.isArray(data)) setTjBoxes(data); }).catch(() => {});
  }, []);

  const selectedPkgPrice = selectedPackage ? parseFloat(selectedPackage.price) : 0;
  const billAmount = Math.max(0, selectedPkgPrice - discount).toFixed(2);

  function handlePackageChange(idStr: string) {
    const pkg = packages.find(p => p.id === Number(idStr)) || null;
    setSelectedPackage(pkg);
  }

  function handleFetchGps() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoordinates(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
        setFetchingGps(false);
      },
      (err) => {
        console.error(err);
        alert("Failed to access location. Please input coordinates manually.");
        setFetchingGps(false);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const password = String(form.get("password") || "").trim();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    const body = {
      name: String(form.get("name") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      alternatePhone: String(form.get("alternatePhone") || "").trim(),
      nidNumber: String(form.get("nidNumber") || "").trim(),
      pppoeUsername: String(form.get("pppoeUsername") || "").trim(),
      password,
      photoUrl: String(form.get("photoUrl") || "").trim(),
      address: String(form.get("address") || "").trim(),
      division,
      district,
      thana,
      packageId: selectedPackage ? selectedPackage.id : null,
      discount: discount,
      billingPosition: String(form.get("billingPosition") || "active_billable"),
      status: String(form.get("status") || "active"),
      joiningDate: form.get("joiningDate") ? String(form.get("joiningDate")) : new Date().toISOString(),
      billingCycleDay: String(form.get("billingCycleDay") || "standard_30"),
      mikrotikId: form.get("mikrotikId") ? Number(form.get("mikrotikId")) : null,
      areaId: form.get("areaId") ? Number(form.get("areaId")) : null,
      oltId: form.get("oltId") ? Number(form.get("oltId")) : null,
      tjBoxId: form.get("tjBoxId") ? Number(form.get("tjBoxId")) : null,
      connectionType: String(form.get("connectionType") || "fiber"),
      customerType: String(form.get("customerType") || "home"),
      onuMac: String(form.get("onuMac") || "").trim(),
      gpsCoordinates: gpsCoordinates.trim(),
      note: String(form.get("note") || "").trim(),
    };

    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to register new client.");
      } else {
        router.push("/admin/customers");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Title */}
      <div className="flex items-center gap-4">
        <Link href="/admin/customers" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-wide">Client Directory</h1>
      </div>

      <form onSubmit={handleSubmit} className="glass-card overflow-hidden shadow-2xl border border-white/10 rounded-2xl">
        {/* Styled Card Header */}
        <div className="bg-emerald-700/80 border-b border-emerald-600/40 p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center text-white font-bold">
            👤+
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">Add New Client / Broadband User</h2>
            <p className="text-xs text-emerald-200 mt-0.5">Register new customer profile, package, billing and POP box mapping.</p>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 md:p-8 space-y-8">
          
          {/* Section 1: Client Identity */}
          <section className="space-y-5">
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase border-b border-white/5 pb-2">Client Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="Full Name *" name="name" required placeholder="Enter Client Name" />
              <Field label="Primary Phone No *" name="phone" required placeholder="e.g. 01711000000" type="tel" />
              <Field label="Alternate Phone" name="alternatePhone" placeholder="Optional Number" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="National ID (NID) *" name="nidNumber" required placeholder="NID Number" />
              <div className="md:col-span-2">
                <Field label="PPPoE ID / Username" name="pppoeUsername" placeholder="Set Mikrotik Username" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="PPPoE Password" name="password" placeholder="Set Mikrotik Password" type="password" />
              <ImageUploadField label="Profile Picture" name="photoUrl" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Division *</label>
                <select
                  required
                  value={division}
                  onChange={(e) => { setDivision(e.target.value); setDistrict(""); setThana(""); }}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="" className="bg-slate-950">-- Select Division --</option>
                  {Object.keys(BD_LOCATIONS).map(d => (
                    <option key={d} value={d} className="bg-slate-950">{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">District *</label>
                <select
                  required
                  value={district}
                  onChange={(e) => { setDistrict(e.target.value); setThana(""); }}
                  disabled={!division}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none disabled:opacity-50"
                >
                  <option value="" className="bg-slate-950">-- Select District --</option>
                  {division && Object.keys(BD_LOCATIONS[division] || {}).map(d => (
                    <option key={d} value={d} className="bg-slate-950">{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Thana / Upazila *</label>
                <select
                  required
                  value={thana}
                  onChange={(e) => setThana(e.target.value)}
                  disabled={!district}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none disabled:opacity-50"
                >
                  <option value="" className="bg-slate-950">-- Select Thana --</option>
                  {division && district && (BD_LOCATIONS[division][district] || []).map(t => (
                    <option key={t} value={t} className="bg-slate-950">{t}</option>
                  ))}
                </select>
              </div>

              <Field label="Village / Area *" name="address" required placeholder="Type village name..." />
            </div>
          </section>

          {/* Section 2: Package & Billing Setup */}
          <section className="space-y-5">
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase border-b border-white/5 pb-2">Package & Billing Setup</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Select Package</label>
                <select
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="" className="bg-slate-950">-- Choose Package --</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-950">{p.name} ({p.speed} - ৳{p.price})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Discount (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Bill Amount</label>
                <div className="flex items-center bg-emerald-950/60 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 font-mono font-bold text-lg select-none">
                  <span className="mr-2">৳</span>
                  <span>{billAmount}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Billing Position / Status</label>
                <select
                  name="billingPosition"
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="active_billable" className="bg-slate-950">Active (Billable)</option>
                  <option value="free_trial" className="bg-slate-950">Free / Trial</option>
                  <option value="suspended" className="bg-slate-950">Suspended / Stopped</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Client Status</label>
                <select
                  name="status"
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="active" className="bg-slate-950">Active</option>
                  <option value="expired" className="bg-slate-950">In-Active / Expired</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Joining Date</label>
                <input
                  type="date"
                  name="joiningDate"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Billing Cycle Day</label>
                <select
                  name="billingCycleDay"
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="standard_30" className="bg-slate-950">Standard 30 Days</option>
                  <option value="pro_rata" className="bg-slate-950">Calculates pro-rata credit</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 3: Network & Location */}
          <section className="space-y-5">
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase border-b border-white/5 pb-2">Network & Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Router / POP</label>
                <select
                  name="mikrotikId"
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="" className="bg-slate-950">-- Select Router --</option>
                  {routers.map(r => (
                    <option key={r.id} value={r.id} className="bg-slate-950">{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Zone Configuration</label>
                <select
                  name="areaId"
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="" className="bg-slate-950">Default / No Zone</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id} className="bg-slate-950">📍 {z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">OLT / PON</label>
                <select
                  name="oltId"
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="" className="bg-slate-950">None</option>
                  {olts.map(o => (
                    <option key={o.id} value={o.id} className="bg-slate-950">⚡ {o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">TJ Box / Splitter</label>
                <select
                  name="tjBoxId"
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="" className="bg-slate-950">None</option>
                  {tjBoxes.map(b => (
                    <option key={b.id} value={b.id} className="bg-slate-950">📦 {b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Connection Type</label>
                <select
                  name="connectionType"
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="fiber" className="bg-slate-950">Fiber (FTTH)</option>
                  <option value="lan" className="bg-slate-950">Cat5/LAN</option>
                  <option value="wifi" className="bg-slate-950">WiFi / Wireless</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Client Type *</label>
                <select
                  name="customerType"
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="home" className="bg-slate-950">Home</option>
                  <option value="corporate" className="bg-slate-950">Corporate</option>
                </select>
              </div>

              <Field label="ONU MAC Address" name="onuMac" placeholder="e.g. AA:BB:CC:11:22:33" />

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">GPS Coordinates (Lat, Long)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={gpsCoordinates}
                    onChange={(e) => setGpsCoordinates(e.target.value)}
                    placeholder="Fetching..."
                    className="flex-1 glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleFetchGps}
                    disabled={fetchingGps}
                    className="w-12 h-12 bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 rounded-xl border border-sky-400/40 flex items-center justify-center transition disabled:opacity-50 shrink-0"
                    title="Get Current Coordinates"
                  >
                    {fetchingGps ? <RefreshCw className="animate-spin" size={18} /> : <Compass size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Remarks</label>
              <textarea
                name="note"
                placeholder="Any notes..."
                rows={3}
                className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
              />
            </div>
          </section>

          {/* Action Trigger */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-emerald-600/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "💾 Register New Client & Save Profile"
              )}
            </button>
            <Link
              href="/admin/customers"
              className="px-8 py-4 bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white rounded-xl font-bold text-center transition"
            >
              Cancel
            </Link>
          </div>

        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">{label}</label>
      <div className="relative">
        <input
          name={name}
          type={isPassword && showPassword ? "text" : type}
          required={required}
          placeholder={placeholder}
          className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
