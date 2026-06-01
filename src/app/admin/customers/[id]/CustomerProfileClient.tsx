"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Edit, Phone, MapPin, Wifi, Package, CreditCard, Image, IdCard, 
  ArrowLeft, Download, Upload, Clock, FileText, CheckCircle2, 
  Printer, Activity, Loader2, Eye, EyeOff
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  photoUrl: string | null;
  nidUrl: string | null;
  nidNumber?: string | null;
  pppoeUsername: string | null;
  macAddress: string | null;
  package?: { name: string; speed: string; price: string } | null;
  status: string | null;
  role: string;
  createdAt?: string | Date | null;
  expireDate?: string | Date | null;
  dob?: string | Date | null;
  areaId?: number | null;
  customerType?: string | null;
  connectionFee?: string | null;
  promiseDate?: string | Date | null;
  note?: string | null;
  balance?: string | null;
}

const toLocalDatetimeString = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

interface Payment {
  id: number;
  amount: string;
  method: string | null;
  status: string | null;
  createdAt: string | Date | null;
}

interface Invoice {
  id: number;
  amount: string;
  status: string | null;
  dueDate: string | Date | null;
}

interface UsageRecord {
  recordedAt: string | Date | null;
  downloadGb: number | string;
  uploadGb: number | string;
}

export default function CustomerProfileClient({
  customer,
  payments,
  invoices,
  usageHistory,
  isOnline,
  activeSession,
  plainTextPassword,
  role = "admin"
}: {
  customer: Customer;
  payments: Payment[];
  invoices: Invoice[];
  usageHistory: UsageRecord[];
  isOnline: boolean;
  activeSession?: any;
  plainTextPassword?: string;
  role?: "admin" | "reseller" | "employee";
}) {
  const basePath = role === "reseller" ? "/reseller" : role === "employee" ? "/employee" : "/admin";

  // Print PDF function
  function handleDownloadPDF() {
    const originalTitle = document.title;
    // Set title to customer name so browser print defaults filename to it
    const safeName = customer.name.trim().replace(/\s+/g, "_");
    document.title = `${safeName}_Profile_Details`;
    
    window.print();
    
    // Restore original title
    document.title = originalTitle;
  }

  const [chartMode, setChartMode] = useState<"history" | "live">(isOnline ? "live" : "history");
  const [liveDownloadRate, setLiveDownloadRate] = useState<number>(0);
  const [liveUploadRate, setLiveUploadRate] = useState<number>(0);
  const [liveBytesIn, setLiveBytesIn] = useState<number>(0);
  const [liveBytesOut, setLiveBytesOut] = useState<number>(0);
  const [accumulatedDownloadBytes, setAccumulatedDownloadBytes] = useState<number>(0);
  const [accumulatedUploadBytes, setAccumulatedUploadBytes] = useState<number>(0);
  const [showPassword, setShowPassword] = useState(false);

  // Dynamic customer fields states
  const [displayNidNumber, setDisplayNidNumber] = useState(customer.nidNumber || "");
  const [displayCreatedAt, setDisplayCreatedAt] = useState<Date | null>(
    customer.createdAt ? new Date(customer.createdAt) : null
  );
  const [displayExpireDate, setDisplayExpireDate] = useState<Date | null>(
    customer.expireDate ? new Date(customer.expireDate) : null
  );
  const [displayDob, setDisplayDob] = useState<Date | null>(
    customer.dob ? new Date(customer.dob) : null
  );
  const [areas, setAreas] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/areas")
      .then(r => r.json())
      .then(setAreas)
      .catch(() => {});
  }, []);

  // Edit fields states
  const [editNidNumber, setEditNidNumber] = useState(customer.nidNumber || "");
  const [editCreatedAt, setEditCreatedAt] = useState(
    customer.createdAt ? new Date(customer.createdAt).toISOString().slice(0, 10) : ""
  );
  const [editExpireDate, setEditExpireDate] = useState(
    customer.expireDate ? toLocalDatetimeString(customer.expireDate) : ""
  );
  const [editDob, setEditDob] = useState(
    customer.dob ? new Date(customer.dob).toISOString().slice(0, 10) : ""
  );

  const [isEditingDates, setIsEditingDates] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const getProfileAge = () => {
    if (!displayCreatedAt) return "N/A";
    const created = new Date(displayCreatedAt);
    created.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = today.getTime() - created.getTime();
    const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    return `${days} দিন`;
  };

  async function handleSaveDates() {
    setSaveLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nidNumber: editNidNumber,
          createdAt: editCreatedAt ? new Date(editCreatedAt).toISOString() : null,
          expireDate: editExpireDate ? new Date(editExpireDate).toISOString() : null,
          dob: editDob ? new Date(editDob).toISOString() : null,
        }),
      });

      if (res.ok) {
        setDisplayNidNumber(editNidNumber);
        setDisplayCreatedAt(editCreatedAt ? new Date(editCreatedAt) : null);
        setDisplayExpireDate(editExpireDate ? new Date(editExpireDate) : null);
        setDisplayDob(editDob ? new Date(editDob) : null);
        setIsEditingDates(false);
      } else {
        const d = await res.json();
        alert(d.error || "Failed to update profile dates");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  }

  const [liveData, setLiveData] = useState<{ name: string; download: number; upload: number }[]>(() => 
    Array.from({ length: 15 }).map((_, i) => ({
      name: `-${15 - i}s`,
      download: 0,
      upload: 0
    }))
  );

  useEffect(() => {
    // Run the interval continuously if the customer is active to track live bandwidth
    // and accumulate bytes in the background.
    if (customer.status !== "active") {
      setLiveDownloadRate(0);
      setLiveUploadRate(0);
      return;
    }
    
    let active = true;
    const interval = setInterval(async () => {
      let dl = 0;
      let ul = 0;
      let bIn = 0;
      let bOut = 0;
      
      try {
        const res = await fetch(`/api/admin/customers/${customer.id}/traffic`);
        const data = await res.json();
        if (res.ok && data.isOnline) {
          dl = parseFloat((data.txBps / 1000000).toFixed(2));
          ul = parseFloat((data.rxBps / 1000000).toFixed(2));
          bIn = data.bytesIn || 0;
          bOut = data.bytesOut || 0;
        } else {
          // No simulation if user is offline or not found
          dl = 0;
          ul = 0;
        }
      } catch (e) {
        console.error("Live traffic speed check failed:", e);
        dl = 0;
        ul = 0;
      }
      
      if (!active) return;
      
      setLiveDownloadRate(dl);
      setLiveUploadRate(ul);
      
      const dlBytes = Math.round((dl * 1000000) / 8);
      const ulBytes = Math.round((ul * 1000000) / 8);
      setAccumulatedDownloadBytes((prev) => prev + dlBytes);
      setAccumulatedUploadBytes((prev) => prev + ulBytes);
      
      if (bIn > 0) {
        setLiveBytesIn(bIn);
      } else {
        setLiveBytesIn((prev) => prev + ulBytes);
      }
      
      if (bOut > 0) {
        setLiveBytesOut(bOut);
      } else {
        setLiveBytesOut((prev) => prev + dlBytes);
      }
      
      setLiveData((prev) => {
        const timeStr = new Date().toLocaleTimeString(undefined, { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" }).slice(-5);
        return [...prev.slice(1), {
          name: timeStr,
          download: dl,
          upload: ul
        }];
      });
    }, 1000);
    
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [customer.id, customer.status, customer.package]);

  // Format data usage history for the chart
  const chartData = usageHistory.map((u) => {
    const dateLabel = u.recordedAt 
      ? new Date(u.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : "N/A";
    return {
      name: dateLabel,
      download: parseFloat(String(u.downloadGb || 0)),
      upload: parseFloat(String(u.uploadGb || 0)),
    };
  });

  const dbTotalDownload = chartData.reduce((sum, d) => sum + d.download, 0);
  const dbTotalUpload = chartData.reduce((sum, d) => sum + d.upload, 0);

  const accumulatedDownloadGb = accumulatedDownloadBytes / (1024 * 1024 * 1024);
  const accumulatedUploadGb = accumulatedUploadBytes / (1024 * 1024 * 1024);

  const totalDownload = (dbTotalDownload + accumulatedDownloadGb).toFixed(4);
  const totalUpload = (dbTotalUpload + accumulatedUploadGb).toFixed(4);

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  function formatSpeed(val: any) {
    const rateInMbps = parseFloat(val);
    if (isNaN(rateInMbps)) return "0 Kbps";
    if (rateInMbps < 0.001) return "0 Kbps";
    if (rateInMbps < 1) {
      const kbps = Math.round(rateInMbps * 1000);
      return `${kbps} Kbps`;
    }
    return `${rateInMbps.toFixed(1)} Mbps`;
  }

  return (
    <div className="space-y-8 max-w-5xl print-container">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div className="flex items-center gap-3">
          <Link href={`${basePath}/customers`} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-wide">Customer Profile</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleDownloadPDF}
            className="glass-button px-4 py-2 text-neon-green border-neon-green/30 flex items-center gap-2"
          >
            <Printer size={18} /> Download PDF
          </button>
          {role !== "employee" && (
            <Link href={`${basePath}/customers/${customer.id}/edit`} className="glass-button px-4 py-2 text-neon-blue border-neon-blue/30 flex items-center gap-2">
              <Edit size={18} /> Edit Customer
            </Link>
          )}
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 text-center flex flex-col justify-center items-center">
          <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-neon-blue to-purple-500 flex items-center justify-center mb-4 text-4xl font-bold text-white shadow-lg">
            {customer.photoUrl ? (
              <img src={customer.photoUrl} alt={customer.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              customer.name.charAt(0).toUpperCase()
            )}
          </div>
          <h2 className="text-2xl font-bold text-white">{customer.name}</h2>
          <p className="text-gray-400 capitalize">{customer.role}</p>
          <div className="mt-4 flex gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${
              customer.status === "expired" 
                ? "bg-orange-500/20 text-orange-400 border-orange-500/30" 
                : "bg-neon-green/20 text-neon-green border-neon-green/30"
            }`}>
              {customer.status || "active"}
            </span>
            {(() => {
              const daysLeft = customer.expireDate ? Math.ceil((new Date(customer.expireDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
              const isExpired = customer.status === "expired" || !customer.expireDate || (daysLeft !== null && daysLeft < 0);
              
              if (isOnline) {
                if (isExpired) {
                  return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border bg-neon-blue/20 text-neon-blue border-neon-blue/30 animate-pulse">
                      <Activity size={10} /> Active
                    </span>
                  );
                } else {
                  return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border bg-neon-green/20 text-neon-green border-neon-green/30">
                      <Activity size={10} /> Online
                    </span>
                  );
                }
              } else {
                return (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border bg-red-500/20 text-red-400 border-red-500/30">
                    Offline
                  </span>
                );
              }
            })()}
          </div>
        </div>

        {/* Details Grid */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-2 flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-white">Account Details</h3>
            {role !== "employee" && (
              <button
                onClick={() => setIsEditingDates(!isEditingDates)}
                className="text-xs px-3 py-1.5 bg-neon-blue/10 hover:bg-neon-blue/20 border border-neon-blue/30 rounded-lg text-neon-blue font-bold transition-all no-print"
              >
                {isEditingDates ? "বন্ধ করুন (Cancel)" : "তারিখ ও NID এডিট (Edit Profile Dates)"}
              </button>
            )}
          </div>
          
          {isEditingDates ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">NID Number</label>
                  <input
                    type="text"
                    value={editNidNumber}
                    onChange={(e) => setEditNidNumber(e.target.value)}
                    className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Date of Birth (জন্ম তারিখ)</label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Profile Creation Date</label>
                  <input
                    type="date"
                    value={editCreatedAt}
                    onChange={(e) => setEditCreatedAt(e.target.value)}
                    className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Expiration Date (Expiry)</label>
                  <input
                    type="datetime-local"
                    value={editExpireDate}
                    onChange={(e) => setEditExpireDate(e.target.value)}
                    className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsEditingDates(false)}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-xs text-gray-400 rounded-lg hover:bg-white/10 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleSaveDates}
                  disabled={saveLoading}
                  className="px-4 py-2 bg-neon-blue/20 border border-neon-blue/40 text-xs text-neon-blue font-bold rounded-lg hover:bg-neon-blue/30 transition-colors flex items-center gap-1.5"
                >
                  {saveLoading && <Loader2 size={12} className="animate-spin" />}
                  সংরক্ষণ করুন (Save)
                </button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <Info icon={<Phone size={18} />} label="Phone Number" value={customer.phone} />
              <Info icon={<MapPin size={18} />} label="Address" value={customer.address || "Not set"} />
              <Info icon={<Wifi size={18} />} label="PPPoE Username" value={customer.pppoeUsername || "Not set"} />
              {/* PPPoE Password Card with Show/Hide toggle */}
              <div className="p-4 bg-white/5 rounded-xl flex items-start justify-between gap-3 border border-white/5">
                <div className="flex items-start gap-3">
                  <div className="text-neon-blue mt-1"><Wifi size={18} /></div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">PPPoE Password</p>
                    <p className="text-white font-medium">
                      {showPassword ? (plainTextPassword || "••••••••") : "••••••••"}
                    </p>
                  </div>
                </div>
                {plainTextPassword && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors mt-0.5"
                    title={showPassword ? "Hide Password" : "Show Password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
              <Info icon={<Wifi size={18} />} label="MAC Address" value={customer.macAddress || "Not set"} />
              <Info icon={<IdCard size={18} />} label="NID Number" value={displayNidNumber || "Not set"} />
              <Info icon={<Clock size={18} />} label="Date of Birth (জন্ম তারিখ)" value={displayDob ? displayDob.toLocaleDateString() : "Not set"} />
              <Info icon={<Package size={18} />} label="Package" value={`${customer.package?.name || "None"} ${customer.package?.speed ? `(${customer.package.speed})` : ""}`} />
              <Info icon={<CreditCard size={18} />} label="Price" value={customer.package?.price ? `৳${customer.package.price}` : "N/A"} />
              <Info icon={<Clock size={18} />} label="Profile Creation Date" value={displayCreatedAt ? displayCreatedAt.toLocaleDateString() : "N/A"} />
               <Info icon={<Clock size={18} />} label="Expiration Date" value={displayExpireDate ? displayExpireDate.toLocaleString() : "N/A"} />
              <Info icon={<Clock size={18} />} label="Profile Age (কত দিন হলো)" value={getProfileAge()} />
              <Info icon={<IdCard size={18} />} label="NID Document" value={customer.nidUrl ? "Uploaded" : "Not uploaded"} />
              <Info icon={<MapPin size={18} />} label="Assigned Area" value={areas.find(a => a.id === customer.areaId)?.name || "Not set"} />
              <Info icon={<Wifi size={18} />} label="Connection Type" value={customer.customerType ? customer.customerType.toUpperCase() : "PPPOE"} />
              <Info icon={<CreditCard size={18} />} label="Connection Fee" value={customer.connectionFee ? `৳${customer.connectionFee}` : "৳0"} />
              <Info icon={<CreditCard size={18} />} label="Current Balance" value={customer.balance ? `৳${customer.balance}` : "৳0"} />
              <Info icon={<Clock size={18} />} label="Promise Date" value={customer.promiseDate ? new Date(customer.promiseDate).toLocaleDateString() : "None"} />
              {customer.note && (
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 md:col-span-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Customer Notes / Remarks</p>
                  <p className="text-amber-300 font-medium italic mt-1">“ {customer.note} ”</p>
                </div>
              )}
              
              {isOnline && activeSession && (
                <>
                  <Info icon={<Wifi size={18} className="text-teal-300 animate-pulse" />} label="Live IP Address" value={activeSession.address || "N/A"} />
                  <Info icon={<Wifi size={18} className="text-teal-300" />} label="Live MAC Address" value={activeSession["caller-id"] || "N/A"} />
                  <Info icon={<Wifi size={18} className="text-teal-300" />} label="Live Session ID" value={activeSession[".id"] || "N/A"} />
                  <Info icon={<Clock size={18} className="text-teal-300" />} label="Session Uptime" value={activeSession.uptime || "N/A"} />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Usage Cards & Graph */}
      <div className="glass-card p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-5 border-b border-white/10 pb-2 flex items-center justify-between flex-wrap gap-2">
          <span>{chartMode === "live" ? "Real-time Traffic Monitor" : "Data Usage History"}</span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 no-print">
              {chartMode === "live" ? "Live Traffic Speed" : `Cumulative: Down ${totalDownload} GB / Up ${totalUpload} GB`}
            </span>
            <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl no-print border border-white/10">
              <button
                type="button"
                onClick={() => setChartMode("history")}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  chartMode === "history"
                    ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/20"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Historical (GB)
              </button>
              <button
                type="button"
                onClick={() => isOnline && setChartMode("live")}
                disabled={!isOnline}
                title={!isOnline ? "Customer is offline. Live rate unavailable." : "View Live Traffic"}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  chartMode === "live"
                    ? "bg-neon-green/20 text-neon-green border border-neon-green/20"
                    : !isOnline
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${!isOnline ? "bg-gray-600" : "bg-neon-green"} ${chartMode === "live" ? "animate-pulse" : ""}`} />
                Live Rate
              </button>
            </div>
          </div>
        </h3>

        {chartMode === "history" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3">
                <div className="text-neon-green"><Download size={20} /></div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Downloaded</p>
                  <p className="text-xl font-bold text-white">{totalDownload} GB</p>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3">
                <div className="text-neon-blue"><Upload size={20} /></div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Uploaded</p>
                  <p className="text-xl font-bold text-white">{totalUpload} GB</p>
                </div>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#39ff14" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#39ff14" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#00f3ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} unit=" GB" />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(15,23,42,.95)", borderColor: "rgba(255,255,255,.1)", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="download" stroke="#39ff14" strokeWidth={2} fillOpacity={1} fill="url(#downGrad)" name="Download (GB)" />
                  <Area type="monotone" dataKey="upload" stroke="#00f3ff" strokeWidth={2} fillOpacity={1} fill="url(#upGrad)" name="Upload (GB)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3 border border-neon-green/20 relative overflow-hidden">
                <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[9px] uppercase font-bold text-neon-green bg-neon-green/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-ping" />
                  Live
                </div>
                <div className="text-neon-green"><Download size={20} /></div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Download Speed</p>
                  <p className="text-xl font-bold text-white font-mono">{formatSpeed(liveDownloadRate)}</p>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3 border border-neon-blue/20 relative overflow-hidden">
                <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[9px] uppercase font-bold text-neon-blue bg-neon-blue/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-ping" />
                  Live
                </div>
                <div className="text-neon-blue"><Upload size={20} /></div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Upload Speed</p>
                  <p className="text-xl font-bold text-white font-mono">{formatSpeed(liveUploadRate)}</p>
                </div>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={liveData}>
                  <defs>
                    <linearGradient id="liveDownGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="liveUpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={9} />
                  <YAxis stroke="#9ca3af" fontSize={11} domain={[0, "auto"]} tickFormatter={formatSpeed} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(15,23,42,.95)", borderColor: "rgba(255,255,255,.1)", borderRadius: 12 }}
                    formatter={(value: any, name: any) => [formatSpeed(Number(value)), name === "download" ? "Download" : "Upload"]}
                  />
                  <Area type="monotone" dataKey="download" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} fillOpacity={1} fill="url(#liveDownGrad)" name="download" />
                  <Area type="monotone" dataKey="upload" stroke="#06b6d4" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} fillOpacity={1} fill="url(#liveUpGrad)" name="upload" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Live RX/TX Interface Statistics Box */}
      <div className="glass-card p-6 border border-teal-500/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-transparent opacity-60" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
              Live MikroTik PPPoE Interface Statistics (RX / TX)
            </h3>
            <p className="text-xs text-gray-400 font-mono">Interface: {customer.pppoeUsername ? `<pppoe-${customer.pppoeUsername}>` : "N/A"}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 text-center min-w-[130px]">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">RX (Upload Speed)</span>
              <p className="text-base font-bold text-neon-blue font-mono mt-1">{formatSpeed(liveUploadRate)}</p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 text-center min-w-[130px]">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">TX (Download Speed)</span>
              <p className="text-base font-bold text-neon-green font-mono mt-1">{formatSpeed(liveDownloadRate)}</p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 text-center min-w-[130px]">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">RX Total (Upload)</span>
              <p className="text-base font-bold text-teal-300 font-mono mt-1">{formatBytes((dbTotalUpload * 1024 * 1024 * 1024) + liveBytesIn)}</p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 text-center min-w-[130px]">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">TX Total (Download)</span>
              <p className="text-base font-bold text-teal-300 font-mono mt-1">{formatBytes((dbTotalDownload * 1024 * 1024 * 1024) + liveBytesOut)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment & Invoice Lists */}
      <div className="grid xl:grid-cols-2 gap-6">
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/10 bg-white/5 flex items-center gap-2">
            <CreditCard size={18} className="text-neon-green" />
            <h3 className="text-white font-semibold">Payment History</h3>
          </div>
          <div className="divide-y divide-white/5">
            {payments.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No payment records</div>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="p-4 flex justify-between items-center text-sm">
                  <div>
                    <span className="text-white font-medium">৳{p.amount}</span>
                    <span className="text-gray-400 text-xs ml-2">({p.method || "N/A"})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      p.status === "approved" ? "text-neon-green bg-neon-green/10" : "text-orange-400 bg-orange-500/10"
                    }`}>
                      {p.status || "pending"}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/10 bg-white/5 flex items-center gap-2">
            <FileText size={18} className="text-neon-blue" />
            <h3 className="text-white font-semibold">Invoices</h3>
          </div>
          <div className="divide-y divide-white/5">
            {invoices.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No invoice records</div>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="p-4 flex justify-between items-center text-sm">
                  <div>
                    <span className="text-white font-medium">INV-{inv.id}</span>
                    <span className="text-gray-400 text-xs ml-2">৳{inv.amount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      inv.status === "paid" ? "text-neon-green bg-neon-green/10" : "text-red-400 bg-red-500/10"
                    }`}>
                      {inv.status || "unpaid"}
                    </span>
                    <span className="text-gray-400 text-xs">
                      Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 bg-white/5 rounded-xl flex items-start gap-3 border border-white/5">
      <div className="text-neon-blue mt-1">{icon}</div>
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-white font-medium">{value}</p>
      </div>
    </div>
  );
}
