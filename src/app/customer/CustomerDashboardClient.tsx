"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Package, CreditCard, Clock, AlertTriangle, ChevronRight, Megaphone,
  Download, Upload, Loader2, Activity, X
} from "lucide-react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { AnimatePresence } from "framer-motion";

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
  noticeImageUrl,
  status,
  usageData = [],
  pppoeUsername = null,
  currentCredit,
  monthlyDownloadGb = 0,
  monthlyUploadGb = 0,
}: {
  customerName: string;
  packageName: string;
  packageSpeed: string;
  expireDate: string | null;
  billStatus: string;
  dueAmount: number;
  noticeTitle: string | null;
  noticeMessage: string | null;
  noticeImageUrl: string | null;
  status: string;
  usageData?: UsageDay[];
  pppoeUsername?: string | null;
  currentCredit: number;
  monthlyDownloadGb?: number;
  monthlyUploadGb?: number;
}) {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [showNoticePopup, setShowNoticePopup] = useState<boolean>(false);

  useEffect(() => {
    if (noticeTitle) {
      const closedNotice = localStorage.getItem('closed_notice');
      if (closedNotice !== noticeTitle) {
        setShowNoticePopup(true);
      }
    }
  }, [noticeTitle]);

  const handleCloseNotice = () => {
    setShowNoticePopup(false);
    if (noticeTitle) {
      localStorage.setItem('closed_notice', noticeTitle);
    }
  };

  useEffect(() => {
    if (expireDate) {
      const days = Math.ceil((new Date(expireDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      setDaysRemaining(days > 0 ? days : 0);
    }
  }, [expireDate]);

  const cards = [
    { label: "Current Package", value: packageName, sub: `Speed: ${packageSpeed}`, icon: Package, color: "text-teal-400" },
    { label: "Credit Balance", value: `৳${currentCredit.toFixed(2)}`, sub: "Available account balance", icon: CreditCard, color: "text-neon-green" },
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
  const [sessionUptimeSeconds, setSessionUptimeSeconds] = useState<number>(0);

  const [liveData, setLiveData] = useState<any[]>(() => 
    Array.from({ length: 30 }).map((_, i) => ({ name: `pad-${i}`, download: null, upload: null }))
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
      if (online) {
        setSessionUptimeSeconds(prev => prev + 1);
      } else {
        setSessionUptimeSeconds(0);
      }
      setLiveDownloadRate(dl);
      setLiveUploadRate(ul);

      const dlBytes = Math.round((dl * 1000000) / 8);
      const ulBytes = Math.round((ul * 1000000) / 8);
      setAccumulatedDownloadBytes((prev) => prev + dlBytes);
      setAccumulatedUploadBytes((prev) => prev + ulBytes);

      if (bOut > 0) {
        setLiveBytesIn(bOut);  // bytesOut from router = bytes sent to client = client download
      } else {
        setLiveBytesIn((prev) => prev + dlBytes);
      }

      if (bIn > 0) {
        setLiveBytesOut(bIn);  // bytesIn from router = bytes received from client = client upload
      } else {
        setLiveBytesOut((prev) => prev + ulBytes);
      }

      setLiveData((prev) => {
        const timeStr = new Date().toLocaleTimeString(undefined, { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" }).slice(-5);
        const newPt = { name: timeStr, download: dl, upload: ul };
        
        const actualData = prev.filter(p => p.download !== null);
        actualData.push(newPt);
        
        if (actualData.length > 30) {
          actualData.shift();
        }
        
        const padded = [...actualData];
        let padIndex = 0;
        while (padded.length < 30) {
          padded.push({ name: `pad-${padIndex++}`, download: null, upload: null });
        }
        return padded;
      });
    }, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [status]);

  // Keep values as exact numbers (no toFixed rounding until display formatting)
  const totalDownloadBytes = (monthlyDownloadGb * (1024 ** 3)) + accumulatedDownloadBytes;
  const totalUploadBytes = (monthlyUploadGb * (1024 ** 3)) + accumulatedUploadBytes;

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

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Notice Popup Overlay */}
      <AnimatePresence>
        {showNoticePopup && noticeTitle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-neon-blue/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative"
            >
              <button
                onClick={handleCloseNotice}
                className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white/70 hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>
              
              {noticeImageUrl && (
                <div className="w-full h-48 sm:h-56 relative bg-black/50">
                  <img src={noticeImageUrl} alt={noticeTitle} className="w-full h-full object-cover" />
                </div>
              )}
              
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center text-neon-blue shrink-0">
                    <Megaphone size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white leading-tight">{noticeTitle}</h3>
                </div>
                
                <p className="text-gray-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                  {noticeMessage}
                </p>
                
                <button
                  onClick={handleCloseNotice}
                  className="mt-6 w-full py-3 bg-neon-blue/20 hover:bg-neon-blue/30 border border-neon-blue/40 text-neon-blue rounded-xl font-bold text-sm tracking-wide transition-colors"
                >
                  Close & Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {noticeTitle && (
        <div className="glass-card p-5 border-neon-blue/30 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-3 items-center">
            <Megaphone className="text-neon-blue shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-white">{noticeTitle}</h3>
              <p className="text-gray-400 text-sm mt-0.5 line-clamp-1">{noticeMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setShowNoticePopup(true)}
            className="px-4 py-2 bg-neon-blue/10 text-neon-blue border border-neon-blue/30 rounded-lg text-xs font-bold hover:bg-neon-blue/20 transition-colors whitespace-nowrap"
          >
            View Notice
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card) => <motion.div key={card.label} initial={false} animate={{ opacity: 1 }} className="glass-card p-6 flex items-start gap-4"><div className={`w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center ${card.color} shadow-lg shrink-0`}><card.icon size={28} /></div><div><p className="text-gray-400 font-medium mb-1">{card.label}</p><h3 className="text-2xl font-bold text-white mb-1">{card.value}</h3><p className="text-sm text-gray-500">{card.sub}</p></div></motion.div>)}
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
            <div className="h-64 w-full bg-[#1C2534] p-4 rounded-xl border border-white/5">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#2f3a4d" vertical={true} horizontal={true} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={9} axisLine={false} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} unit=" GB" axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "#1C2534", borderColor: "#2f3a4d", borderRadius: 8 }} 
                    formatter={(value: any, name: any) => [`${value} GB`, name === "download" ? "Tx" : "Rx"]}
                  />
                  <Legend iconType="square" formatter={(value) => <span className="text-gray-300 text-xs">{value === "download" ? "Tx (Download)" : "Rx (Upload)"}</span>} />
                  <Line type="monotone" dataKey="download" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="upload" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <>
            <div className="glass-card p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Activity size={18} className="text-red-500" /> Live Traffic Monitoring
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-white/5 rounded-xl border border-red-500/20 relative">
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] uppercase font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> Live
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-red-500"><Download size={24} /></div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Download Speed</p>
                      <p className="text-2xl font-bold text-white font-mono">{formatSpeed(liveDownloadRate)}</p>
                      <p className="text-xs text-gray-400 mt-1">Session: <span className="text-red-400 font-semibold">{formatBytes(liveBytesIn)}</span></p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-green-500/20 relative">
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] uppercase font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" /> Live
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-500"><Upload size={24} /></div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Upload Speed</p>
                      <p className="text-2xl font-bold text-white font-mono">{formatSpeed(liveUploadRate)}</p>
                      <p className="text-xs text-gray-400 mt-1">Session: <span className="text-green-400 font-semibold">{formatBytes(liveBytesOut)}</span></p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-64 w-full bg-[#1C2534] p-4 rounded-xl border border-white/5">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={liveData}>
                    <CartesianGrid stroke="#2f3a4d" vertical={true} horizontal={true} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={9} axisLine={false} tickLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={formatSpeed} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#2a313a", borderColor: "#3f4a59", borderRadius: 4 }}
                      formatter={(value: any, name: any) => [formatSpeed(Number(value)), name === "download" ? "Tx Packet" : "Rx Packet"]}
                      labelStyle={{ display: 'none' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="left" 
                      iconType="square" 
                      wrapperStyle={{ paddingLeft: '10px', bottom: '0px' }}
                      formatter={(value) => <span className="text-gray-300 text-[11px] font-sans">{value === "download" ? "Tx Packet" : "Rx Packet"}</span>} 
                    />
                    <Line type="linear" dataKey="download" stroke="#0ea5e9" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="linear" dataKey="upload" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Live Session Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10">
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Session ↓</p>
                  <p className="text-sm text-red-400 font-mono font-bold">{formatBytes(liveBytesIn)}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">MikroTik Actual</p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Session ↑</p>
                  <p className="text-sm text-green-400 font-mono font-bold">{formatBytes(liveBytesOut)}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">MikroTik Actual</p>
                </div>
                <div className="bg-white/10 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Session Total</p>
                  <p className="text-sm text-white font-mono font-bold">{formatBytes(liveBytesIn + liveBytesOut)}</p>
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
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">MTU</span>
              <p className="text-base font-bold text-white font-mono mt-1">{isOnline ? "1480" : "0"}</p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 text-center min-w-[130px]">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Status</span>
              <p className={`text-base font-bold font-mono mt-1 ${isOnline ? "text-teal-400" : "text-red-500"}`}>
                {isOnline ? "Running" : "Offline"}
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
