"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Package, CreditCard, Clock, AlertTriangle, ChevronRight, Megaphone,
  Download, Upload, Loader2, Activity
} from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface UsageDay {
  day: string;
  download: number;
  upload: number;
  hasReal: boolean;
}

export default function CustomerDashboardClient({
  customerName,
  packageName,
  packageSpeed,
  expireDate,
  billStatus,
  dueAmount,
  noticeTitle,
  noticeMessage,
  status,
  usageData = [],
  pppoeUsername = null,
}: {
  customerName: string;
  packageName: string;
  packageSpeed: string;
  expireDate: string | null;
  billStatus: string;
  dueAmount: number;
  noticeTitle: string | null;
  noticeMessage: string | null;
  status: string;
  usageData?: UsageDay[];
  pppoeUsername?: string | null;
}) {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (expireDate) {
      const days = Math.ceil((new Date(expireDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      setDaysRemaining(days > 0 ? days : 0);
    }
  }, [expireDate]);

  const cards = [
    { label: "Current Package", value: packageName, sub: `Speed: ${packageSpeed}`, icon: Package, color: "text-teal-400" },
    { label: "Bill Status", value: billStatus, sub: billStatus === "Paid" ? "No unpaid bill" : "Please pay bill", icon: CreditCard, color: billStatus === "Paid" ? "text-neon-green" : "text-red-400" },
    { label: "Due Amount", value: `৳${dueAmount}`, sub: "Clear dues to avoid disconnect", icon: AlertTriangle, color: dueAmount > 0 ? "text-red-400" : "text-neon-green" },
    { label: "Expire Date", value: daysRemaining !== null ? `${daysRemaining} days` : "N/A", sub: expireDate ? new Date(expireDate).toLocaleDateString() : "N/A", icon: Clock, color: "text-orange-400" },
  ];

  // Recharts states and totals
  const chartData = usageData.map((u) => ({
    name: u.day,
    download: parseFloat(String(u.download || 0)),
    upload: parseFloat(String(u.upload || 0)),
  }));

  const dbTotalDownload = chartData.reduce((sum, d) => sum + d.download, 0);
  const dbTotalUpload = chartData.reduce((sum, d) => sum + d.upload, 0);

  const [chartMode, setChartMode] = useState<"history" | "live">(status === "active" || status === "online" ? "live" : "history");
  const [liveDownloadRate, setLiveDownloadRate] = useState<number>(0);
  const [liveUploadRate, setLiveUploadRate] = useState<number>(0);
  const [liveBytesIn, setLiveBytesIn] = useState<number>(0);
  const [liveBytesOut, setLiveBytesOut] = useState<number>(0);
  const [accumulatedDownloadBytes, setAccumulatedDownloadBytes] = useState<number>(0);
  const [accumulatedUploadBytes, setAccumulatedUploadBytes] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(status === "active" || status === "online");

  const [liveData, setLiveData] = useState<{ name: string; download: number; upload: number }[]>(() => 
    Array.from({ length: 15 }).map((_, i) => ({
      name: `-${15 - i}s`,
      download: 0,
      upload: 0
    }))
  );

  useEffect(() => {
    // If user's package is expired/suspended or not active, rates remain 0
    if (status !== "active" && status !== "online") {
      setLiveDownloadRate(0);
      setLiveUploadRate(0);
      setIsOnline(false);
      return;
    }

    let active = true;
    const interval = setInterval(async () => {
      let dl = 0;
      let ul = 0;
      let bIn = 0;
      let bOut = 0;
      let online = false;

      try {
        const res = await fetch("/api/customer/traffic");
        const data = await res.json();
        if (res.ok && data.isOnline) {
          dl = parseFloat((data.txBps / 1000000).toFixed(2));
          ul = parseFloat((data.rxBps / 1000000).toFixed(2));
          bIn = data.bytesIn || 0;
          bOut = data.bytesOut || 0;
          online = true;
        }
      } catch (e) {
        console.error("Live traffic speed check failed:", e);
      }

      if (!active) return;

      setIsOnline(online);
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
  }, [status]);

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
    <div className="space-y-8 max-w-6xl mx-auto">
      <motion.div initial={false} animate={{ opacity: 1 }} className="relative overflow-hidden rounded-3xl p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-green/20 via-teal-500/20 to-blue-500/20 backdrop-blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Welcome, <span className="bg-clip-text text-transparent bg-gradient-to-r from-neon-green to-teal-400">{customerName}</span>
          </h2>
          <p className="text-gray-300 text-lg flex items-center gap-2 mt-2">
            Your connection status: 
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
              status === "active" || status === "online" 
                ? "bg-neon-green/20 text-neon-green border-neon-green/30" 
                : status === "expired" 
                  ? "bg-orange-500/20 text-orange-400 border-orange-500/30" 
                  : status === "suspended"
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
            }`}>
              {status}
            </span>
          </p>
        </div>
      </motion.div>

      {daysRemaining !== null && daysRemaining <= 3 && (
        <div className="glass-card p-5 border-orange-500/40 bg-orange-500/5 flex gap-3 items-center">
          <AlertTriangle className="text-orange-400 shrink-0 animate-bounce" size={24} />
          <div className="flex-1">
            <h3 className="font-bold text-white">প্যাকেজ মেয়াদ শেষ হওয়ার সতর্কতা!</h3>
            <p className="text-gray-300 text-sm mt-0.5">
              আপনার internet কানেকশনের মেয়াদ আর মাত্র <span className="text-orange-400 font-bold">{daysRemaining} দিন</span> বাকি আছে। সচল রাখতে দ্রুত রিচার্জ করুন।
            </p>
          </div>
          <Link
            href="/customer/pay-bill"
            className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/30 text-xs font-bold transition-all shrink-0"
          >
            Pay Bill
          </Link>
        </div>
      )}

      {noticeTitle && <div className="glass-card p-5 border-neon-blue/30"><div className="flex gap-3"><Megaphone className="text-neon-blue shrink-0" /><div><h3 className="font-bold text-white">{noticeTitle}</h3><p className="text-gray-400 text-sm mt-1">{noticeMessage}</p></div></div></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card) => <motion.div key={card.label} initial={false} animate={{ opacity: 1 }} className="glass-card p-6 flex items-start gap-4"><div className={`w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center ${card.color} shadow-lg shrink-0`}><card.icon size={28} /></div><div><p className="text-gray-400 font-medium mb-1">{card.label}</p><h3 className="text-2xl font-bold text-white mb-1">{card.value}</h3><p className="text-sm text-gray-500">{card.sub}</p></div></motion.div>)}
      </div>

      {/* Data Usage Chart */}
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
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-teal-400 animate-ping" : "bg-red-500"}`} />
              Live MikroTik PPPoE Interface Statistics (RX / TX)
            </h3>
            <p className="text-xs text-gray-400 font-mono">Interface: {pppoeUsername ? `<pppoe-${pppoeUsername}>` : "N/A"}</p>
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
              <p className="text-base font-bold text-teal-300 font-mono mt-1">
                {formatBytes((dbTotalUpload * 1024 * 1024 * 1024) + liveBytesIn)}
              </p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 text-center min-w-[130px]">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">TX Total (Download)</span>
              <p className="text-base font-bold text-teal-300 font-mono mt-1">
                {formatBytes((dbTotalDownload * 1024 * 1024 * 1024) + liveBytesOut)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 md:p-8">
        <h3 className="text-xl font-semibold text-white mb-6">Quick Actions</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/customer/pay-bill" className="group glass-button p-4 flex items-center justify-between hover:bg-neon-green/10 hover:border-neon-green/30"><div className="flex items-center gap-4"><div className="p-3 rounded-full bg-neon-green/20 text-neon-green"><CreditCard size={24} /></div><div className="text-left"><p className="font-semibold text-white group-hover:text-neon-green">Pay Bill</p><p className="text-sm text-gray-400">bKash/Nagad payment submit</p></div></div><ChevronRight className="text-gray-500 group-hover:text-neon-green" /></Link>
          <Link href="/customer/support" className="group glass-button p-4 flex items-center justify-between hover:bg-blue-500/10 hover:border-blue-500/30"><div className="flex items-center gap-4"><div className="p-3 rounded-full bg-blue-500/20 text-blue-400"><AlertTriangle size={24} /></div><div className="text-left"><p className="font-semibold text-white group-hover:text-blue-400">Support Ticket</p><p className="text-sm text-gray-400">Complaint & support</p></div></div><ChevronRight className="text-gray-500 group-hover:text-blue-400" /></Link>
        </div>
      </div>
    </div>
  );
}
