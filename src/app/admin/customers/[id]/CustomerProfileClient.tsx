"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Edit, Phone, MapPin, Wifi, Package, CreditCard, IdCard, 
  ArrowLeft, Download, Upload, Clock, FileText, Activity, 
  Loader2, Eye, EyeOff, Terminal, RotateCcw, Router, ShieldCheck, CheckCircle2, XCircle, Save, KeyRound, Search, Plus
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { usePopup } from "@/components/ui/PopupProvider";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import AvatarImage from "@/components/ui/AvatarImage";

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
  walletBalance?: string | null;
  ponPort?: string | null;
  onuMac?: string | null;
  ipAddress?: string | null;
  olt?: { name: string; ipAddress: string } | null;
  routerUsername?: string | null;
  routerPassword?: string | null;
  routerModel?: string | null;
  mikrotikId?: number | null;
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
  role = "admin",
  currentCredit = 0,
  remainingDays = 0,
  monthlyDownloadGb = 0,
  monthlyUploadGb = 0
}: {
  customer: Customer;
  payments: Payment[];
  invoices: Invoice[];
  usageHistory: UsageRecord[];
  isOnline: boolean;
  activeSession?: any;
  plainTextPassword?: string;
  role?: "admin" | "reseller" | "employee";
  currentCredit?: number;
  remainingDays?: number;
  monthlyDownloadGb?: number;
  monthlyUploadGb?: number;
}) {
  const basePath = role === "reseller" ? "/reseller" : role === "employee" ? "/employee" : "/admin";

  const [activeTab, setActiveTab] = useState<"service" | "billing" | "activity" | "ledger">("service");
  
  // Modals for tools
  const [showPingModal, setShowPingModal] = useState(false);
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [toolOutput, setToolOutput] = useState("");

  const [liveDownloadRate, setLiveDownloadRate] = useState<number>(0);
  const [liveUploadRate, setLiveUploadRate] = useState<number>(0);
  const [accumulatedDownloadBytes, setAccumulatedDownloadBytes] = useState<number>(0);
  const [accumulatedUploadBytes, setAccumulatedUploadBytes] = useState<number>(0);
  // Real session bytes directly from MikroTik (bytes-in = upload from router perspective = download for customer)
  const [sessionBytesIn, setSessionBytesIn] = useState<number>(0);
  const [sessionBytesOut, setSessionBytesOut] = useState<number>(0);
  const [showPassword, setShowPassword] = useState(false);

  // Profile states
  const [displayNidNumber, setDisplayNidNumber] = useState(customer.nidNumber || "");
  const [displayCreatedAt, setDisplayCreatedAt] = useState<Date | null>(customer.createdAt ? new Date(customer.createdAt) : null);
  const [displayExpireDate, setDisplayExpireDate] = useState<Date | null>(customer.expireDate ? new Date(customer.expireDate) : null);

  const { showConfirm, showAlert } = usePopup();
  const [displayDob, setDisplayDob] = useState<Date | null>(customer.dob ? new Date(customer.dob) : null);
  const [areas, setAreas] = useState<any[]>([]);

  // Real ONU Data State
  const [onuData, setOnuData] = useState({
    rxPower: "—",
    txPower: "—",
    temperature: "—",
    voltage: "—",
    distance: "—",
    uptime: "—",
    routerModel: "Unknown",
    routerVendor: null as string | null,
    ipAddress: null as string | null,
    onuMac: null as string | null,
    isRxGood: false
  });
  
  useEffect(() => {
    fetch(`/api/admin/customers/${customer.id}/diagnostics`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setOnuData({
            rxPower: data.rxPower,
            txPower: data.txPower,
            temperature: data.temperature,
            voltage: data.voltage,
            distance: data.distance,
            uptime: data.uptime,
            routerModel: data.routerModel,
            routerVendor: data.routerVendor || null,
            ipAddress: data.ipAddress || null,
            onuMac: data.onuMac || null,
            isRxGood: parseFloat(data.rxPower) >= -27
          });
        }
      })
      .catch(() => {});
  }, [customer.id]);

  // Fetch router system info directly from router (real-time board name)
  useEffect(() => {
    if (!customer.mikrotikId) return;
    let active = true;
    fetch(`/api/admin/mikrotik/${customer.mikrotikId}/system`)
      .then(r => r.json())
      .then(data => {
        if (!active) return;
        if (!data.error && data.boardName) {
          setOnuData(prev => ({ ...prev, routerModel: data.boardName }));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [customer.mikrotikId]);

  const { rxPower, txPower, temperature: onuTemp, voltage: onuVoltage, distance: onuDistance, uptime: onuUptime, routerModel: wifiRouterModel, routerVendor: wifiRouterVendor, isRxGood } = onuData;

  useEffect(() => {
    fetch("/api/admin/areas").then(r => r.json()).then(setAreas).catch(() => {});
  }, []);

  const [liveData, setLiveData] = useState<{ name: string; download: number; upload: number }[]>(() => 
    Array.from({ length: 15 }).map((_, i) => ({ name: `-${15 - i}s`, download: 0, upload: 0 }))
  );
  const [sessionUptimeSeconds, setSessionUptimeSeconds] = useState<number>(0);
  const [chartMode, setChartMode] = useState<"live" | "history">("live");

  const chartData = usageHistory.map((d: any) => ({
    name: new Date(d.recordedAt || "").toLocaleDateString("en-US", { weekday: "short" }),
    download: parseFloat(String(d.downloadGb || 0)),
    upload: parseFloat(String(d.uploadGb || 0)),
  }));

  useEffect(() => {
    if (customer.status !== "active") return;
    let active = true;
    const interval = setInterval(async () => {
      let dl = 0, ul = 0;
      try {
        const res = await fetch(`/api/admin/customers/${customer.id}/traffic`);
        const data = await res.json();
        if (res.ok && data.isOnline) {
          // txBps = router sends to client = download speed for client
          dl = parseFloat((data.txBps / 1000000).toFixed(3));
          // rxBps = router receives from client = upload speed for client
          ul = parseFloat((data.rxBps / 1000000).toFixed(3));
          // bytesIn/Out from MikroTik = actual session bytes (most accurate)
          // MikroTik: bytes-in = data received by router FROM client (client upload)
          //           bytes-out = data sent by router TO client (client download)
          if (data.bytesOut !== undefined) setSessionBytesIn(data.bytesOut);  // client download
          if (data.bytesIn !== undefined) setSessionBytesOut(data.bytesIn);   // client upload
        }
      } catch (e) {}
      if (!active) return;

      if (dl > 0 || ul > 0) {
        setSessionUptimeSeconds(prev => prev + 1);
      } else {
        setSessionUptimeSeconds(0);
      }

      setLiveDownloadRate(dl);
      setLiveUploadRate(ul);

      const dlBytes = Math.round((dl * 1000000) / 8);
      const ulBytes = Math.round((ul * 1000000) / 8);
      setAccumulatedDownloadBytes((p) => p + dlBytes);
      setAccumulatedUploadBytes((p) => p + ulBytes);

      setLiveData((prev) => {
        const timeStr = new Date().toLocaleTimeString(undefined, { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" }).slice(-5);
        return [...prev.slice(1), { name: timeStr, download: dl, upload: ul }];
      });
    }, 1000);
    return () => { active = false; clearInterval(interval); };
  }, [customer.id, customer.status]);

  // Keep values as exact numbers (no toFixed rounding until display formatting)
  const totalDownloadBytes = (monthlyDownloadGb * (1024 ** 3)) + accumulatedDownloadBytes;
  const totalUploadBytes = (monthlyUploadGb * (1024 ** 3)) + accumulatedUploadBytes;

  function formatSpeed(val: any) {
    const rate = parseFloat(val);
    if (isNaN(rate) || rate < 0.001) return "0 Kbps";
    if (rate < 1) return `${Math.round(rate * 1000)} Kbps`;
    return `${rate.toFixed(1)} Mbps`;
  }

  function formatSpeedNumberOnly(val: number) {
    if (isNaN(val) || val < 0) return "0.00";
    return val.toFixed(2);
  }

  function formatUptime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  const handleReboot = async () => {
    const isConfirm = await showConfirm({
      title: "Reboot ONU",
      message: "Are you sure you want to reboot the ONU?",
      confirmText: "Reboot",
    });
    if (isConfirm) {
      setIsRebooting(true);
      setTimeout(() => setIsRebooting(false), 3000);
      showAlert({ title: "Success", message: "ONU Reboot command sent successfully", type: "success" });
    }
  };



  const handleForceDisconnect = async () => {
    if (!customer.pppoeUsername) {
      await showAlert({ title: "Error", message: "This customer doesn't have a PPPoE username assigned.", type: "error" });
      return;
    }
    const isConfirm = await showConfirm({
      title: "Force Disconnect",
      message: `Are you sure you want to disconnect ${customer.name} from the router?`,
      danger: true,
      confirmText: "Disconnect"
    });
    if (!isConfirm) return;
    
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disconnect",
          name: customer.pppoeUsername,
          routerId: customer.mikrotikId,
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await showAlert({ title: "Disconnected", message: data.message || "Disconnected successfully.", type: "success" });
      } else {
        await showAlert({ title: "Failed", message: "Failed to disconnect: " + (data.error || "Unknown error"), type: "error" });
      }
    } catch (e) {
      await showAlert({ title: "Error", message: "Failed to send disconnect command.", type: "error" });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handlePing = async () => {
    setShowPingModal(true);
    const ip = activeSession?.address || customer.ipAddress;
    if (!ip) {
      setToolOutput("Error: No active IP address found for customer to ping.");
      return;
    }
    setToolOutput(`Pinging ${ip}...\n`);
    try {
      const res = await fetch("/api/admin/tools/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      setToolOutput(data.result || data.error || "Unknown error occurred.");
    } catch (e) {
      setToolOutput("Failed to execute ping command on server.");
    }
  };

  const handleTraceRoute = async () => {
    setShowTraceModal(true);
    const ip = activeSession?.address || customer.ipAddress;
    if (!ip) {
      setToolOutput("Error: No active IP address found for customer to trace.");
      return;
    }
    setToolOutput(`Tracing route to ${ip}...\n`);
    try {
      const res = await fetch("/api/admin/tools/traceroute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      setToolOutput(data.result || data.error || "Unknown error occurred.");
    } catch (e) {
      setToolOutput("Failed to execute traceroute command on server.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Profile & Top Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Card: Identity */}
        <div className="glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-4 right-4">
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${
              isOnline ? "bg-neon-green/10 text-neon-green border-neon-green/30" : "bg-red-500/10 text-red-400 border-red-500/30"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-neon-green animate-ping" : "bg-red-500"}`} />
              {isOnline ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-neon-blue to-purple-500 flex items-center justify-center mb-4 text-3xl font-bold text-white shadow-lg shadow-neon-blue/20 overflow-hidden">
            <AvatarImage 
              src={customer.photoUrl} 
              fallbackText={customer.name.charAt(0).toUpperCase()} 
            />
          </div>
          <h2 className="text-2xl font-bold text-white text-center">{customer.name}</h2>
          <p className="text-gray-400 text-sm">{customer.phone} • {customer.pppoeUsername}</p>
          
          <button 
            onClick={handleForceDisconnect}
            disabled={isDisconnecting || !isOnline}
            className={`mt-6 w-full py-3 border font-bold rounded-xl transition-all flex justify-center items-center gap-2 ${
              isDisconnecting || !isOnline 
                ? "bg-gray-500/10 border-gray-500/30 text-gray-500 cursor-not-allowed" 
                : "bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400"
            }`}
          >
            {isDisconnecting ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />} 
            {isDisconnecting ? "Disconnecting..." : "Force Disconnect"}
          </button>
        </div>

        {/* Middle Card: Package & Billing */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2 flex items-center gap-2">
            <Package size={18} className="text-neon-blue" /> Package Details
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-sm text-gray-400">Current Plan</span>
              <span className="font-bold text-neon-blue">{customer.package?.name || "N/A"} ({customer.package?.speed || "0 Mbps"})</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-sm text-gray-400">Monthly Fee</span>
              <span className="font-bold text-white">৳ {customer.package?.price || "0"}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-sm text-gray-400">Expiry Date & Time</span>
              <span className={`font-bold ${customer.status === 'expired' ? 'text-red-400' : 'text-neon-green'}`}>
                {displayExpireDate ? displayExpireDate.toLocaleString() : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-sm text-gray-400">Credit Days Left</span>
              <span className="font-bold text-teal-400">
                {remainingDays && remainingDays > 0 
                  ? `${Math.floor(remainingDays)} Days ${Math.floor((remainingDays % 1) * 24)} Hours (৳ ${currentCredit?.toFixed(2) || "0.00"})` 
                  : "0 Days (৳ 0.00)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Usage Chart */}
      <div className="glass-card p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-5 border-b border-white/10 pb-2 flex items-center justify-between flex-wrap gap-2">
          <span>{chartMode === "live" ? "Real-time Traffic Monitor" : "Data Usage History"}</span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 no-print">
              {chartMode === "live" ? "Live Traffic Speed" : `Cumulative: Down ${formatBytes(totalDownloadBytes)} / Up ${formatBytes(totalUploadBytes)}`}
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
                onClick={() => setChartMode("live")}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  chartMode === "live"
                    ? "bg-neon-green/20 text-neon-green border border-neon-green/20"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full bg-neon-green ${chartMode === "live" ? "animate-pulse" : ""}`} />
                Live Rate
              </button>
            </div>
          </div>
        </h3>

        {chartMode === "history" ? (
          <>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3 border border-red-500/20">
                <div className="text-red-500"><Download size={24} /></div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Downloaded</p>
                  <p className="text-2xl font-bold text-white font-mono">{formatBytes(totalDownloadBytes)}</p>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3 border border-green-500/20">
                <div className="text-green-500"><Upload size={24} /></div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Uploaded</p>
                  <p className="text-2xl font-bold text-white font-mono">{formatBytes(totalUploadBytes)}</p>
                </div>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="historyDownGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="historyUpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={9} />
                  <YAxis stroke="#9ca3af" fontSize={11} unit=" GB" />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "rgba(15,23,42,.95)", borderColor: "rgba(255,255,255,.1)", borderRadius: 12 }} 
                    formatter={(value: any, name: any) => [`${value} GB`, name === "download" ? "Download" : "Upload"]}
                  />
                  <Area type="monotone" dataKey="download" stroke="#ef4444" strokeWidth={2} activeDot={{ r: 4 }} fill="url(#historyDownGrad)" />
                  <Area type="monotone" dataKey="upload" stroke="#22c55e" strokeWidth={2} activeDot={{ r: 4 }} fill="url(#historyUpGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <>
            <div className="glass-card p-6 mb-6">

              {/* Speed cards — top row */}
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                {/* Download Speed Card */}
                <div className="p-4 bg-white/5 rounded-xl border border-red-500/20 relative">
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] uppercase font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> Live
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-red-500"><Download size={24} /></div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Download Speed</p>
                      <p className="text-2xl font-bold text-white font-mono">{formatSpeed(liveDownloadRate)}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Session: <span className="text-red-400 font-semibold">{formatBytes(sessionBytesIn)}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upload Speed Card */}
                <div className="p-4 bg-white/5 rounded-xl border border-green-500/20 relative">
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] uppercase font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" /> Live
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-500"><Upload size={24} /></div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Upload Speed</p>
                      <p className="text-2xl font-bold text-white font-mono">{formatSpeed(liveUploadRate)}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Session: <span className="text-green-400 font-semibold">{formatBytes(sessionBytesOut)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={liveData}>
                    <defs>
                      <linearGradient id="liveDownGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="liveUpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={9} />
                    <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={formatSpeed} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "rgba(15,23,42,.95)", borderColor: "rgba(255,255,255,.1)", borderRadius: 12 }}
                      formatter={(value: any, name: any) => [formatSpeed(Number(value)), name === "download" ? "Download" : "Upload"]}
                    />
                    <Area type="monotone" dataKey="download" stroke="#ef4444" strokeWidth={2} activeDot={{ r: 4 }} fill="url(#liveDownGrad)" />
                    <Area type="monotone" dataKey="upload" stroke="#22c55e" strokeWidth={2} activeDot={{ r: 4 }} fill="url(#liveUpGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Live Session Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10">
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Session ↓</p>
                  <p className="text-sm text-red-400 font-mono font-bold">{formatBytes(sessionBytesIn)}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">MikroTik Actual</p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Session ↑</p>
                  <p className="text-sm text-green-400 font-mono font-bold">{formatBytes(sessionBytesOut)}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">MikroTik Actual</p>
                </div>
                <div className="bg-white/10 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Session Total</p>
                  <p className="text-sm text-white font-mono font-bold">{formatBytes(sessionBytesIn + sessionBytesOut)}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">↓+↑ Combined</p>
                </div>
                <div className="bg-white/10 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Monthly Total</p>
                  <p className="text-sm text-blue-400 font-mono font-bold">{formatBytes(totalDownloadBytes + totalUploadBytes)}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">DB Record</p>
                </div>
                <div className="bg-white/10 p-3 rounded-lg text-center col-span-2 md:col-span-1">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Session Uptime</p>
                  <p className="text-sm text-white font-mono font-bold">{formatUptime(sessionUptimeSeconds)}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">Active Time</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>



      {/* Device Info & ONU Diagnostics */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Device Info */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-4 mb-4 flex items-center gap-2">
            <Router size={18} className="text-neon-blue" /> Device Information
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
              <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase font-semibold">WiFi Router Brand</p>
                <p className="font-semibold text-white mt-0.5">{wifiRouterVendor || wifiRouterModel}</p>
              </div>
              <Wifi size={20} className="text-gray-500" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Router Admin User</p>
                <p className="font-semibold text-white mt-0.5 font-mono text-sm">{customer.routerUsername || customer.pppoeUsername || "—"}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Router Admin Pass</p>
                <p className="font-semibold text-white mt-0.5 font-mono text-sm">{customer.routerPassword || plainTextPassword || "—"}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">OLT Name / Port</p>
                <p className="font-semibold text-white mt-0.5 text-sm">{customer.olt?.name || "N/A"}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">ONU Distance</p>
                <p className="font-semibold text-white mt-0.5 text-sm">{onuDistance}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5 col-span-2">
                <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Live Tracking (IP & MAC)</p>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">IP:</span>
                    <span className="text-xs text-neon-blue font-mono font-semibold">{activeSession?.address || customer.ipAddress || "Offline"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">MAC:</span>
                    <span className="text-xs text-neon-blue font-mono font-semibold">{activeSession?.["caller-id"] || customer.macAddress || "Offline"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ONU Diagnostics */}
        <div className="glass-card p-6 border border-teal-500/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-teal-400" /> ONU Diagnostics
              </h3>
              <button 
                onClick={handleReboot}
                disabled={isRebooting}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded flex items-center gap-1.5 transition-all"
              >
                {isRebooting ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                Reboot ONU
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${
                isRxGood ? "bg-neon-green/5 border-neon-green/30" : "bg-red-500/5 border-red-500/30"
              }`}>
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Rx Power</span>
                <span className={`text-2xl font-bold ${isRxGood ? "text-neon-green" : "text-red-400"}`}>{rxPower}</span>
                <span className="text-[10px] text-gray-500 mt-1">dBm</span>
              </div>
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Tx Power</span>
                <span className="text-2xl font-bold text-white">{txPower}</span>
                <span className="text-[10px] text-gray-500 mt-1">dBm</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-slate-900/50 p-2 rounded text-center border border-white/5">
                <span className="block text-[9px] text-gray-400 uppercase">Temp</span>
                <span className="text-sm font-semibold text-amber-300">{onuTemp} °C</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded text-center border border-white/5">
                <span className="block text-[9px] text-gray-400 uppercase">Voltage</span>
                <span className="text-sm font-semibold text-teal-300">{onuVoltage} V</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded text-center border border-white/5">
                <span className="block text-[9px] text-gray-400 uppercase">Uptime</span>
                <span className="text-sm font-semibold text-white">{onuUptime}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handlePing} className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-gray-300 flex justify-center items-center gap-1.5 transition-all">
                <Terminal size={14} /> Ping Report
              </button>
              <button onClick={handleTraceRoute} className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-gray-300 flex justify-center items-center gap-1.5 transition-all">
                <Activity size={14} /> Trace Route
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* Bottom Tabs */}
      <div className="glass-card overflow-hidden">
        <div className="flex overflow-x-auto border-b border-white/10 no-scrollbar">
          {[
            { id: "service", label: "Service Details" },
            { id: "billing", label: "Billing Details" },
            { id: "activity", label: "Activity Log" },
            { id: "ledger", label: "Ledger" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? "text-neon-blue border-b-2 border-neon-blue bg-white/5" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="p-6">
          {activeTab === "service" && (
            <div className="grid md:grid-cols-2 gap-4">
              <Info icon={<Phone size={18} />} label="Phone" value={customer.phone} />
              <Info icon={<KeyRound size={18} />} label="PPPoE Username" value={customer.pppoeUsername || activeSession?.name || "Not set"} />
              <Info icon={<MapPin size={18} />} label="Address" value={customer.address || "Not set"} />
              <div className="p-4 bg-white/5 rounded-xl flex items-start justify-between gap-3 border border-white/5">
                <div className="flex items-start gap-3">
                  <div className="text-neon-blue mt-1"><Wifi size={18} /></div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">PPPoE Password</p>
                    <p className="text-white font-medium">{showPassword ? (plainTextPassword || "••••••••") : "••••••••"}</p>
                  </div>
                </div>
                {plainTextPassword && (
                  <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-white">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
              <Info icon={<IdCard size={18} />} label="NID Number" value={displayNidNumber || "Not set"} />
              <Info icon={<Clock size={18} />} label="Date of Birth" value={displayDob ? displayDob.toLocaleDateString() : "Not set"} />
              <Info icon={<MapPin size={18} />} label="Assigned Area" value={areas.find(a => a.id === customer.areaId)?.name || "Not set"} />
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-4">
              <h4 className="text-white font-semibold mb-2">Recent Invoices</h4>
              {invoices.length === 0 ? <p className="text-gray-500">No invoices found.</p> : (
                <div className="divide-y divide-white/5 bg-white/5 rounded-xl border border-white/10">
                  {invoices.slice(0, 5).map(inv => (
                    <div key={inv.id} className="p-4 flex justify-between items-center text-sm">
                      <div><span className="text-white font-medium">INV-{inv.id}</span> <span className="text-gray-400 text-xs ml-2">৳{inv.amount}</span></div>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${inv.status === "paid" ? "text-neon-green bg-neon-green/10" : "text-red-400 bg-red-500/10"}`}>{inv.status || "unpaid"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "activity" && (
             <div className="flex justify-center items-center py-12 text-gray-500">
               <Activity className="mr-2" /> No recent activity logs.
             </div>
          )}

          {activeTab === "ledger" && (
            <div className="space-y-4">
              <h4 className="text-white font-semibold mb-2">Payment Ledger</h4>
              {payments.length === 0 ? <p className="text-gray-500">No payments found.</p> : (
                <div className="divide-y divide-white/5 bg-white/5 rounded-xl border border-white/10">
                  {payments.slice(0, 5).map(p => (
                    <div key={p.id} className="p-4 flex justify-between items-center text-sm">
                      <div><span className="text-white font-medium">৳{p.amount}</span> <span className="text-gray-400 text-xs ml-2">({p.method || "Cash"})</span></div>
                      <span className="text-gray-400 text-xs">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tool Modals (Ping/TraceRoute) */}
      <AnimatePresence>
        {(showPingModal || showTraceModal) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Terminal size={18} className="text-neon-blue" />
                  {showPingModal ? "Ping Report" : "IP Trace Route"}
                </h3>
                <button onClick={() => { setShowPingModal(false); setShowTraceModal(false); setToolOutput(""); }} className="text-gray-400 hover:text-white">
                  <XCircle size={20} />
                </button>
              </div>
              <div className="p-4 bg-black/40 min-h-[300px]">
                <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">{toolOutput}</pre>
                {!toolOutput.includes("complete") && !toolOutput.includes("statistics") && (
                  <div className="flex items-center gap-2 text-gray-500 text-xs mt-4">
                    <Loader2 size={12} className="animate-spin" /> Running diagnostics...
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
