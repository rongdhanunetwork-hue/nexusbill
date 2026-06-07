"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Compass, AlertCircle, RefreshCw } from "lucide-react";
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

interface Customer {
  id: number;
  name: string;
  phone: string;
  alternatePhone: string | null;
  nidNumber: string | null;
  pppoeUsername: string | null;
  photoUrl: string | null;
  address: string | null;
  district: string | null;
  thana: string | null;
  packageId: number | null;
  discount: string | null;
  billingPosition: string | null;
  status: string | null;
  joiningDate: string | null;
  createdAt: string | null;
  billingCycleDay: string | null;
  mikrotikId: number | null;
  areaId: number | null;
  oltId: number | null;
  connectionType: string | null;
  customerType: string | null;
  onuMac: string | null;
  gpsCoordinates: string | null;
  note: string | null;
}

const DISTRICT_THANAS: Record<string, string[]> = {
  Dhaka: ["Mirpur", "Uttara", "Gulshan", "Dhanmondi", "Badda", "Mohammadpur", "Khilgaon", "Tejgaon", "Ramna", "Savar", "Keraniganj", "Dhamrai"],
  Chittagong: ["Panchlaish", "Double Mooring", "Kotwali", "Halishahar", "Patenga", "Hathazari", "Sitakunda", "Rangunia", "Patiya"],
  Sylhet: ["Kotwali", "Shahparan", "South Surma", "Jaintiapur", "Beanibazar", "Golapganj", "Sreemangal"],
  Rajshahi: ["Boalia", "Rajpara", "Motihar", "Shah Makhdum", "Paba", "Bagha", "Godagari"],
  Khulna: ["Kotwali", "Sonadanga", "Khalishpur", "Daulatpur", "Khan Jahan Ali", "Rupsha"],
  Barisal: ["Kotwali", "Airport", "South Surma", "Bakerganj", "Wazirpur"],
  Rangpur: ["Kotwali", "Mithapukur", "Pirganj", "Kaunia", "Badarganj"],
  Mymensingh: ["Kotwali", "Muktagachha", "Bhaluka", "Trishal", "Gafargaon"]
};

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const customerId = Number(id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [routers, setRouters] = useState<RouterPop[]>([]);
  const [zones, setZones] = useState<AreaZone[]>([]);
  const [olts, setOlts] = useState<OltTjBox[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic values
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [fetchingGps, setFetchingGps] = useState(false);
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/packages").then(r => r.json()).catch(() => []),
      fetch("/api/admin/mikrotik/routers").then(r => r.json()).catch(() => []),
      fetch("/api/admin/areas").then(r => r.json()).catch(() => []),
      fetch("/api/admin/olts").then(r => r.json()).catch(() => []),
      fetch(`/api/admin/customers/${customerId}`).then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
    ]).then(([packagesData, routersData, zonesData, oltsData, customerData]) => {
      setPackages(packagesData);
      setRouters(routersData);
      setZones(zonesData);
      setOlts(oltsData);
      setCustomer(customerData);

      // Prepopulate state
      if (customerData.packageId) {
        const pkg = packagesData.find((p: Package) => p.id === customerData.packageId) || null;
        setSelectedPackage(pkg);
      }
      setDiscount(customerData.discount ? parseFloat(customerData.discount) : 0);
      setGpsCoordinates(customerData.gpsCoordinates || "");
      setDistrict(customerData.district || "");
      setThana(customerData.thana || "");
      setLoading(false);
    }).catch(() => {
      setError("Failed to load customer details.");
      setLoading(false);
    });
  }, [customerId]);

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
    setSubmitting(true);
    setError(null);

    const body: any = {
      name: String(form.get("name") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      alternatePhone: String(form.get("alternatePhone") || "").trim(),
      nidNumber: String(form.get("nidNumber") || "").trim(),
      pppoeUsername: String(form.get("pppoeUsername") || "").trim(),
      photoUrl: String(form.get("photoUrl") || "").trim(),
      address: String(form.get("address") || "").trim(),
      district,
      thana,
      packageId: selectedPackage ? selectedPackage.id : null,
      discount: discount,
      billingPosition: String(form.get("billingPosition") || "active_billable"),
      status: String(form.get("status") || "active"),
      joiningDate: form.get("joiningDate") ? String(form.get("joiningDate")) : null,
      billingCycleDay: String(form.get("billingCycleDay") || "standard_30"),
      mikrotikId: form.get("mikrotikId") ? Number(form.get("mikrotikId")) : null,
      areaId: form.get("areaId") ? Number(form.get("areaId")) : null,
      oltId: form.get("oltId") ? Number(form.get("oltId")) : null,
      connectionType: String(form.get("connectionType") || "fiber"),
      customerType: String(form.get("customerType") || "home"),
      onuMac: String(form.get("onuMac") || "").trim(),
      gpsCoordinates: gpsCoordinates.trim(),
      note: String(form.get("note") || "").trim(),
    };

    if (password) {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        setSubmitting(false);
        return;
      }
      body.password = password;
    }

    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setError(data.error || "Failed to update customer.");
      } else {
        router.push(`/admin/customers/${customerId}`);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={40} className="animate-spin text-neon-blue" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12 text-red-400">
        <AlertCircle size={40} className="mx-auto mb-2" />
        Customer not found
      </div>
    );
  }

  const defaultJoiningDate = customer.joiningDate 
    ? customer.joiningDate.slice(0, 10) 
    : customer.createdAt 
      ? customer.createdAt.slice(0, 10) 
      : new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Title */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/customers/${customer.id}`} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-wide">Edit Client Profile</h1>
      </div>

      <form onSubmit={handleSubmit} className="glass-card overflow-hidden shadow-2xl border border-white/10 rounded-2xl">
        {/* Styled Card Header */}
        <div className="bg-emerald-700/80 border-b border-emerald-600/40 p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center text-white font-bold">
            ✏️
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">Edit Client / Broadband User</h2>
            <p className="text-xs text-emerald-200 mt-0.5">Modify customer identity, billing rules, and network POP assignments.</p>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 md:p-8 space-y-8">
          
          {/* Section 1: Client Identity */}
          <section className="space-y-5">
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase border-b border-white/5 pb-2">Client Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="Full Name *" name="name" required defaultValue={customer.name} placeholder="Enter Client Name" />
              <Field label="Primary Phone No *" name="phone" required defaultValue={customer.phone} placeholder="e.g. 01711000000" type="tel" />
              <Field label="Alternate Phone" name="alternatePhone" defaultValue={customer.alternatePhone || ""} placeholder="Optional Number" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="National ID (NID) *" name="nidNumber" required defaultValue={customer.nidNumber || ""} placeholder="NID Number" />
              <div className="md:col-span-2">
                <Field label="PPPoE ID / Username" name="pppoeUsername" defaultValue={customer.pppoeUsername || ""} placeholder="Set Mikrotik Username" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">New Password</label>
                <input
                  name="password"
                  type="password"
                  placeholder="Keep current password"
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                />
              </div>
              <ImageUploadField label="Profile Picture" name="photoUrl" defaultValue={customer.photoUrl || ""} />
              <Field label="Address" name="address" defaultValue={customer.address || ""} placeholder="House, Street, Area info" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">District *</label>
                <select
                  required
                  value={district}
                  onChange={(e) => { setDistrict(e.target.value); setThana(""); }}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="" className="bg-slate-955">-- Select District --</option>
                  {Object.keys(DISTRICT_THANAS).map(d => (
                    <option key={d} value={d} className="bg-slate-955">{d}</option>
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
                  <option value="" className="bg-slate-955">-- Select Thana --</option>
                  {district && DISTRICT_THANAS[district].map(t => (
                    <option key={t} value={t} className="bg-slate-955">{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Section 2: Package & Billing Setup */}
          <section className="space-y-5">
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase border-b border-white/5 pb-2">Package & Billing Setup</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Select Package</label>
                <select
                  value={selectedPackage ? selectedPackage.id : ""}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="" className="bg-slate-955">-- Choose Package --</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-955">{p.name} ({p.speed} - ৳{p.price})</option>
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
                  defaultValue={customer.billingPosition || "active_billable"}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="active_billable" className="bg-slate-955">Active (Billable)</option>
                  <option value="free_trial" className="bg-slate-955">Free / Trial</option>
                  <option value="suspended" className="bg-slate-955">Suspended / Stopped</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Client Status</label>
                <select
                  name="status"
                  defaultValue={customer.status || "active"}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="active" className="bg-slate-955">Active</option>
                  <option value="expired" className="bg-slate-955">In-Active / Expired</option>
                  <option value="suspended" className="bg-slate-955">Suspended</option>
                  <option value="pending" className="bg-slate-955">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Joining Date</label>
                <input
                  type="date"
                  name="joiningDate"
                  defaultValue={defaultJoiningDate}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Billing Cycle Day</label>
                <select
                  name="billingCycleDay"
                  defaultValue={customer.billingCycleDay || "standard_30"}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="standard_30" className="bg-slate-955">Standard 30 Days</option>
                  <option value="pro_rata" className="bg-slate-955">Calculates pro-rata credit</option>
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
                  defaultValue={customer.mikrotikId || ""}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="" className="bg-slate-955">-- Select Router --</option>
                  {routers.map(r => (
                    <option key={r.id} value={r.id} className="bg-slate-955">{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Zone Configuration</label>
                <select
                  name="areaId"
                  defaultValue={customer.areaId || ""}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="" className="bg-slate-955">Default / No Zone</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id} className="bg-slate-955">📍 {z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">TJ Box / Port</label>
                <select
                  name="oltId"
                  defaultValue={customer.oltId || ""}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="" className="bg-slate-955">None</option>
                  {olts.map(o => (
                    <option key={o.id} value={o.id} className="bg-slate-955">⚡ {o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Connection Type</label>
                <select
                  name="connectionType"
                  defaultValue={customer.connectionType || "fiber"}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="fiber" className="bg-slate-955">Fiber (FTTH)</option>
                  <option value="lan" className="bg-slate-955">Cat5/LAN</option>
                  <option value="wifi" className="bg-slate-955">WiFi / Wireless</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Client Type *</label>
                <select
                  name="customerType"
                  defaultValue={customer.customerType || "home"}
                  className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
                >
                  <option value="home" className="bg-slate-955">Home</option>
                  <option value="corporate" className="bg-slate-955">Corporate</option>
                </select>
              </div>

              <Field label="ONU MAC Address" name="onuMac" defaultValue={customer.onuMac || ""} placeholder="e.g. AA:BB:CC:11:22:33" />

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
                defaultValue={customer.note || ""}
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
              disabled={submitting}
              className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-emerald-600/20"
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "💾 Register New Client & Save Profile"
              )}
            </button>
            <Link
              href={`/admin/customers/${customer.id}`}
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
  defaultValue = "",
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full glass-input px-4 py-3 bg-slate-900/60 text-white rounded-xl focus:outline-none"
      />
    </div>
  );
}
