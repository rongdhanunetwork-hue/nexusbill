"use client";

import { motion } from "framer-motion";
import { Users, Wifi, WifiOff, Clock, DollarSign, Activity, AlertTriangle, Router, RadioTower, Download, Upload, CalendarCheck, RefreshCw, MoreHorizontal, Eye, Edit, FileText, ShieldAlert, Cpu, HardDrive } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, LabelList } from "recharts";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ─── Animated Counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ value, prefix = "", decimals = 0 }: { value: number; prefix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const end = isNaN(value) ? 0 : Math.max(0, value);
    if (end === 0) { setDisplay(0); return; }
    if (decimals > 0) { setDisplay(end); return; }
    let start = 0;
    const timer = setInterval(() => {
      start += Math.max(1, Math.ceil(end / 18));
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, 35);
    return () => clearInterval(timer);
  }, [value, decimals]);

  return <span>{prefix}{decimals > 0 ? display.toFixed(decimals) : display.toLocaleString()}</span>;
}

// ─── Live Indicator ────────────────────────────────────────────────────────────
function LiveBadge({ lastUpdated }: { lastUpdated: string | null }) {
  const [timeAgo, setTimeAgo] = useState("লাইভ");

  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000);
      if (secs < 10) setTimeAgo("এইমাত্র");
      else if (secs < 60) setTimeAgo(`${secs}s আগে`);
      else setTimeAgo(`${Math.floor(secs / 60)}m আগে`);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-xs font-semibold border border-green-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      LIVE · {timeAgo}
    </span>
  );
}

// ─── MikroTik Resources Widget ───────────────────────────────────────────────
function MikrotikResourcesWidget({ refreshTrigger }: { refreshTrigger: number }) {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trafficHistory, setTrafficHistory] = useState<Record<number, any[]>>({});

  useEffect(() => {
    let active = true;
    const fetchResources = async () => {
      try {
        const res = await fetch("/api/admin/dashboard/mikrotik-resources");
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setResources(data);
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
            setTrafficHistory(prev => {
              const newHist = { ...prev };
              data.forEach((r: any) => {
                if (r.resource?.rxBps !== undefined) {
                   const dl = parseFloat((r.resource.rxBps / 1000000).toFixed(2));
                   const ul = parseFloat((r.resource.txBps / 1000000).toFixed(2));
                   const rxPkts = r.resource.rxPps || 0;
                   const txPkts = r.resource.txPps || 0;
                   const cpuLoad = parseInt(r.resource["cpu-load"]) || 0;
                   const memTotal = parseInt(r.resource["total-memory"]) || 1;
                   const memFree = parseInt(r.resource["free-memory"]) || 0;
                   const memUsedMb = parseFloat(((memTotal - memFree) / (1024 * 1024)).toFixed(1));
                   
                   const routerHist = newHist[r.routerId] || Array.from({ length: 14 }).map((_, i) => ({ time: `-${14-i}s`, download: dl, upload: ul, rxPkts, txPkts, cpuLoad, memUsedMb }));
                   const updatedHist = [...routerHist, { time: timeStr, download: dl, upload: ul, rxPkts, txPkts, cpuLoad, memUsedMb }];
                   newHist[r.routerId] = updatedHist.length > 15 ? updatedHist.slice(updatedHist.length - 15) : updatedHist;
                }
              });
              return newHist;
            });
          }
        }
      } catch (e) {
        console.error("Failed to fetch mikrotik resources", e);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchResources();
    const interval = setInterval(fetchResources, 5000); // Real-time auto-refresh every 5s
    return () => { active = false; clearInterval(interval); };
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="glass-card p-6 min-w-0 overflow-hidden mb-6 flex items-center justify-center h-32">
        <span className="text-gray-500 animate-pulse flex items-center gap-2">
          <Router size={20} className="animate-spin" /> Fetching MikroTik Data...
        </span>
      </div>
    );
  }

  if (resources.length === 0) return null;

  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return "0 MB";
    const bytes = parseInt(bytesStr);
    if (bytes > 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatUptime = (uptimeStr?: string) => {
    if (!uptimeStr) return "N/A";
    let totalDays = 0;
    const wMatch = uptimeStr.match(/(\d+)w/);
    if (wMatch) totalDays += parseInt(wMatch[1]) * 7;
    const dMatch = uptimeStr.match(/(\d+)d/);
    if (dMatch) totalDays += parseInt(dMatch[1]);
    const hMatch = uptimeStr.match(/(\d+)h/);
    const h = hMatch ? parseInt(hMatch[1]) : 0;
    const mMatch = uptimeStr.match(/(\d+)m/);
    const m = mMatch ? parseInt(mMatch[1]) : 0;
    
    let parts = [];
    if (totalDays > 0) parts.push(`${totalDays} Days`);
    if (h > 0) parts.push(`${h} Hrs`);
    if (m > 0) parts.push(`${m} Mins`);
    if (parts.length === 0) return "Just now";
    return parts.join(" ");
  };


  return (
    <div className="mb-6 flex flex-col gap-6">
      {resources.map((router) => {
        const res = router.resource;
        const totalMem = res?.["total-memory"] ? parseInt(res["total-memory"]) : 1;
        const freeMem = res?.["free-memory"] ? parseInt(res["free-memory"]) : 0;
        const usedMem = totalMem - freeMem;
        
        return (
          <div key={router.routerId} className="flex flex-col gap-4">
            {/* Box 1: CPU and Memory Stats */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} 
              className="p-4 rounded-xl border border-neon-blue/20 bg-neon-blue/5 shadow-[0_0_15px_rgba(6,182,212,0.1)] flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                {/* Left Column: Router Info, CPU, Memory, Uptime */}
                <div className="col-span-1 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center text-neon-blue shrink-0">
                      <Router size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">MikroTik Router: {res?.["board-name"] || router.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${res ? "bg-neon-green" : "bg-red-500"}`}></div>
                        <span className="text-[11px] text-gray-400 font-medium">{res ? "Online & Syncing Live" : "Offline"}</span>
                      </div>
                    </div>
                  </div>

                  {res && (
                    <div className="flex flex-col gap-3 mt-2 h-full">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[11px] text-gray-500 uppercase font-semibold">CPU Load</span>
                        <span className="text-lg font-bold text-white font-mono">{res["cpu-load"]}%</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[11px] text-gray-500 uppercase font-semibold">Memory Usage</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {formatBytes(usedMem.toString())} <span className="text-[10px] text-gray-500 font-sans">/ {formatBytes(res["total-memory"])}</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-gray-500 uppercase font-semibold">Uptime</span>
                        <span className="text-sm font-bold text-neon-blue font-sans tracking-wide">{formatUptime(res.uptime)}</span>
                      </div>

                      {/* CPU Bar Graph */}
                      {trafficHistory[router.routerId] && trafficHistory[router.routerId].length > 1 && (
                        <div className="flex-1 w-full mt-2 bg-black/20 rounded-lg p-3 border border-white/5 flex flex-col min-h-[110px]">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-gray-300 font-medium text-xs">CPU Trend</h4>
                            <span className="text-[10px] bg-[#8b5cf6]/20 text-[#a855f7] px-1.5 py-0.5 rounded border border-[#8b5cf6]/30 font-medium flex items-center gap-1">
                              <Cpu size={10} /> Live
                            </span>
                          </div>
                          <div className="flex-1 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={trafficHistory[router.routerId]} margin={{ top: 15, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="cpuColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4}/>
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" vertical={true} horizontal={true} />
                                <YAxis domain={[0, 100]} hide />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: "rgba(15,23,42,.95)", borderColor: "rgba(255,255,255,.2)", borderRadius: 6, padding: '4px 6px', fontSize: '11px' }}
                                  labelStyle={{ display: 'none' }}
                                  formatter={(val: any) => [`${val}%`, 'CPU']}
                                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                  isAnimationActive={false}
                                />
                                <Area type="stepAfter" dataKey="cpuLoad" stroke="#ef4444" strokeWidth={1.5} fill="url(#cpuColor)" isAnimationActive={false} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Traffic Monitor (Byte Graph only) */}
                {res && trafficHistory[router.routerId] && trafficHistory[router.routerId].length > 1 && (
                  <div className="col-span-1 lg:col-span-2 flex flex-col h-full bg-black/20 rounded-lg p-3 border border-white/5">
                    <div className="flex flex-wrap items-center justify-between mb-3">
                      <h3 className="text-gray-300 font-medium text-sm">Traffic Monitor</h3>
                      {res.rxBps !== undefined && (
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-[#00ff88] uppercase font-bold flex items-center gap-1 tracking-wider"><Download size={12}/> Download</span>
                            <span className="text-sm font-bold text-[#00ff88] font-mono">{(res.rxBps / 1000000).toFixed(1)} <span className="text-[10px] font-sans text-[#00ff88]/70 font-medium">Mbps</span></span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-[#00e5ff] uppercase font-bold flex items-center gap-1 tracking-wider"><Upload size={12}/> Upload</span>
                            <span className="text-sm font-bold text-[#00e5ff] font-mono">{(res.txBps / 1000000).toFixed(1)} <span className="text-[10px] font-sans text-[#00e5ff]/70 font-medium">Mbps</span></span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Byte Graph */}
                    <div className="flex-1 w-full relative min-h-[120px] max-h-[160px] bg-[#1C2534] rounded-lg mt-2 overflow-hidden border border-white/5">
                      <ResponsiveContainer width="100%" height="100%" minHeight={120}>
                        <LineChart data={trafficHistory[router.routerId]} margin={{ top: 15, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="#2f3a4d" vertical={true} horizontal={true} />
                          <XAxis dataKey="time" hide />
                          <YAxis 
                            tickFormatter={(val) => `${val}`} 
                            stroke="rgba(255,255,255,0.4)" 
                            fontSize={10}
                            width={50}
                            domain={[0, 'auto']}
                            tickLine={false}
                            axisLine={false}
                            unit=" Mbps"
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#1C2534", borderColor: "#2f3a4d", borderRadius: 8, padding: '4px 6px', fontSize: '11px' }}
                            labelStyle={{ display: 'none' }}
                            formatter={(val: any, name: any) => [`${val} Mbps`, name]}
                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                            isAnimationActive={false}
                          />
                          <Line type="monotone" dataKey="download" stroke="#ef4444" strokeWidth={2} dot={false} name="Rx" isAnimationActive={false} />
                          <Line type="monotone" dataKey="upload" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Tx" isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-4 mt-2 ml-[30px]">
                      <div className="flex items-center gap-1.5 text-xs text-gray-300"><div className="w-2.5 h-2.5 bg-[#0ea5e9]"></div> Tx Packet</div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-300"><div className="w-2.5 h-2.5 bg-[#ef4444]"></div> Rx Packet</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Initial Props (for SSR/first render) ────────────────────────────────────
interface DashboardProps {
  role?: "admin" | "reseller" | "employee";
  totalCustomers: number;
  activeCustomers: number;
  onlineCustomers: number;
  offlineCustomers: number;
  expiredCustomers: number;
  expired1Day: number;
  expired2Day: number;
  expired3Day: number;
  expired4Day: number;
  todayRecharge: number;
  todayCollection?: number;
  expectedCollection?: number;
  paidThisMonthCount?: number;
  unpaidThisMonthCount?: number;
  connectionFeeToday?: number;
  totalConnectionFee?: number;
  businessBalance?: number;
  totalExpense?: number;
  totalizerCollection: number;
  dueAmount: number;
  routerCount: number;
  oltCount: number;
  upcomingExpires: number;
  newCustomersThisMonth: any[];
  expiringToday: any[];
  monthlyIncomeData?: { name: string; income: number }[];
  dailyUsageData?: { name: string; download: number; upload: number }[];
}

export default function AdminDashboardClient({
  role = "admin",
  ...initialProps
}: DashboardProps) {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [data, setData] = useState({
    totalCustomers: initialProps.totalCustomers,
    activeCustomers: initialProps.activeCustomers,
    expiredCustomers: initialProps.expiredCustomers,
    expired1Day: initialProps.expired1Day,
    expired2Day: initialProps.expired2Day,
    expired3Day: initialProps.expired3Day,
    expired4Day: initialProps.expired4Day,
    expectedCollection: initialProps.expectedCollection ?? 0,
    todayCollection: initialProps.todayCollection ?? 0,
    todayRecharge: initialProps.todayRecharge,
    totalizerCollection: initialProps.totalizerCollection,
    dueAmount: initialProps.dueAmount,
    businessBalance: initialProps.businessBalance ?? 0,
    totalExpense: initialProps.totalExpense ?? 0,
    paidThisMonthCount: initialProps.paidThisMonthCount ?? 0,
    unpaidThisMonthCount: initialProps.unpaidThisMonthCount ?? 0,
    connectionFeeToday: initialProps.connectionFeeToday ?? 0,
    totalConnectionFee: initialProps.totalConnectionFee ?? 0,
    upcomingExpires: initialProps.upcomingExpires,
    routerCount: initialProps.routerCount,
    oltCount: initialProps.oltCount,
    newCustomersThisMonth: initialProps.newCustomersThisMonth || [],
    expiringToday: initialProps.expiringToday || [],
    monthlyIncomeData: initialProps.monthlyIncomeData || [],
    dailyUsageData: initialProps.dailyUsageData || [],
  });

  const [onlineCount, setOnlineCount] = useState<number>(initialProps.onlineCustomers ?? 0);
  const [offlineCount, setOfflineCount] = useState<number>(initialProps.offlineCustomers ?? initialProps.activeCustomers);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  // ─── Main stats polling (30s) ───────────────────────────────────────────────
  const apiEndpoint = role === "reseller"
    ? "/api/reseller/dashboard/stats"
    : role === "employee"
    ? "/api/employee/dashboard/stats"
    : "/api/admin/dashboard/stats";

  const fetchStats = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      const res = await fetch(apiEndpoint);
      if (!res.ok) return;
      const d = await res.json();
      setData({
        totalCustomers: d.totalCustomers ?? 0,
        activeCustomers: d.activeCustomers ?? 0,
        expiredCustomers: d.expiredCustomers ?? 0,
        expired1Day: d.expired1Day ?? 0,
        expired2Day: d.expired2Day ?? 0,
        expired3Day: d.expired3Day ?? 0,
        expired4Day: d.expired4Day ?? 0,
        expectedCollection: d.expectedCollection ?? 0,
        todayCollection: d.todayCollection ?? 0,
        todayRecharge: d.todayRecharge ?? 0,
        totalizerCollection: d.totalizerCollection ?? 0,
        dueAmount: d.dueAmount ?? 0,
        businessBalance: d.businessBalance ?? 0,
        totalExpense: d.totalExpense ?? 0,
        paidThisMonthCount: d.paidThisMonthCount ?? 0,
        unpaidThisMonthCount: d.unpaidThisMonthCount ?? 0,
        connectionFeeToday: d.connectionFeeToday ?? 0,
        totalConnectionFee: d.totalConnectionFee ?? 0,
        upcomingExpires: d.upcomingExpires ?? 0,
        routerCount: d.routerCount ?? 0,
        oltCount: d.oltCount ?? 0,
        newCustomersThisMonth: d.newCustomersThisMonth || [],
        expiringToday: d.expiringToday || [],
        monthlyIncomeData: d.monthlyIncomeData || [],
        dailyUsageData: d.dailyUsageData || [],
      });
      setLastUpdated(d.timestamp || new Date().toISOString());
    } catch (e) {
      console.error("Dashboard stats fetch error:", e);
    } finally {
      if (showRefreshing) {
        setTimeout(() => setIsRefreshing(false), 600);
        setRefreshTrigger(prev => prev + 1);
      }
    }
  }, [apiEndpoint]);

  // ─── Online/offline polling (15s) ─────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard/active-status");
      if (!res.ok) return;
      const d = await res.json();
      if (typeof d.onlineCustomers === "number") setOnlineCount(d.onlineCustomers);
      if (typeof d.offlineCustomers === "number") setOfflineCount(d.offlineCustomers);
    } catch (e) {
      console.error("Active status fetch error:", e);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchStatus();
    const statsInterval = setInterval(() => fetchStats(), 30000);
    const statusInterval = setInterval(() => fetchStatus(), 15000);
    return () => {
      clearInterval(statsInterval);
      clearInterval(statusInterval);
    };
  }, [fetchStats, fetchStatus]);

  const basePath = role === "reseller" ? "/reseller" : role === "employee" ? "/employee" : "/admin";

  const downloadCSV = (title: string, csvData: any[]) => {
    const headers = ["Name", "Phone", "PPPoE Username", "Package", "Created At", "Expire Date"];
    const rows = csvData.map(u => [
      u.name, u.phone, u.pppoeUsername || "N/A",
      u.package?.name || "No Plan",
      u.createdAt ? new Date(u.createdAt).toLocaleString() : "N/A",
      u.expireDate ? new Date(u.expireDate).toLocaleString() : "N/A"
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = [
    { name: "Total Customer", value: data.totalCustomers, icon: Users, color: "text-blue-400", glow: "shadow-blue-500/40", href: `${basePath}/customers` },
    { name: "Active Customer", value: data.activeCustomers, icon: Wifi, color: "text-neon-green", glow: "shadow-green-500/40", href: `${basePath}/customers?status=active` },
    { name: "Online Customer", value: onlineCount, icon: Activity, color: "text-teal-300", glow: "shadow-teal-500/40", href: `${basePath}/customers?status=online` },
    { name: "Offline Customer", value: offlineCount, icon: WifiOff, color: "text-neon-red", glow: "shadow-red-500/40", href: `${basePath}/customers?status=offline` },
    { name: "Expired Customer", value: data.expiredCustomers, icon: Clock, color: "text-orange-400", glow: "shadow-orange-500/40", href: `${basePath}/customers?status=expired` },
    { name: "Paid Customer (Month)", value: data.paidThisMonthCount, icon: Users, color: "text-emerald-400", glow: "shadow-emerald-500/40", href: `${basePath}/customers?status=paid_month` },
    { name: "Unpaid Customer (Month)", value: data.unpaidThisMonthCount, icon: Users, color: "text-rose-400", glow: "shadow-rose-500/40", href: `${basePath}/customers?status=unpaid_month` },
    { name: "Running Month New User", value: data.newCustomersThisMonth?.length || 0, icon: Users, color: "text-indigo-400", glow: "shadow-indigo-500/40", href: `${basePath}/customers?status=new_month` },
    { name: "Today Expire", value: data.expiringToday?.length || 0, icon: Clock, color: "text-pink-400", glow: "shadow-pink-500/40", href: `${basePath}/customers?status=today_expire` },
    { name: "1 Day Expired", value: data.expired1Day, icon: AlertTriangle, color: "text-red-300", glow: "shadow-red-400/40", href: `${basePath}/customers?status=expired` },
    { name: "2 Day Expired", value: data.expired2Day, icon: AlertTriangle, color: "text-red-400", glow: "shadow-red-500/40", href: `${basePath}/customers?status=expired` },
    { name: "3 Day Expired", value: data.expired3Day, icon: AlertTriangle, color: "text-red-500", glow: "shadow-red-600/40", href: `${basePath}/customers?status=expired` },
    { name: "4 Day Expired", value: data.expired4Day, icon: AlertTriangle, color: "text-red-600", glow: "shadow-red-700/40", href: `${basePath}/customers?status=expired` },
    { name: "Today Recharge", value: data.todayRecharge, icon: CalendarCheck, color: "text-neon-blue", glow: "shadow-cyan-500/40", href: `${basePath}/billing` },
    { name: "Upcoming Expire", value: data.upcomingExpires, icon: Clock, color: "text-yellow-400", glow: "shadow-yellow-500/40", href: `${basePath}/customers?status=upcoming` },
    ...(role !== "reseller" ? [
      { name: "Router Added", value: data.routerCount, icon: Router, color: "text-purple-300", glow: "shadow-purple-500/40", href: `${basePath}/mikrotik` },
      { name: "OLT Added", value: data.oltCount, icon: RadioTower, color: "text-pink-300", glow: "shadow-pink-500/40", href: `${basePath}/mikrotik` },
    ] : []),
  ];

  return (
    <div className="space-y-8">
      {/* Live Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LiveBadge lastUpdated={lastUpdated} />
          <span className="text-gray-500 text-xs">প্রতি ৩০ সেকেন্ডে আপডেট হয়</span>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* MikroTik Resources Widget moved to the top */}
      {role === "admin" && <MikrotikResourcesWidget refreshTrigger={refreshTrigger} />}

      {/* Tier 1 Primary Financial Indicators */}
      {role !== "employee" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href={`${basePath}/customers?status=unpaid_month`} className="block group">
          <motion.div initial={false} animate={{ opacity: 1 }} className="glass-card p-6 flex items-center justify-between relative overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <p className="text-gray-400 font-medium mb-1 text-sm group-hover:text-blue-300 transition-colors">Expected Collection</p>
              <h2 className="text-3xl font-bold text-white tracking-wider"><AnimatedCounter value={data.expectedCollection} prefix="৳" /></h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.25)] relative z-10 group-hover:scale-110 transition-transform animate-pulse">
              <CalendarCheck size={24} />
            </div>
          </motion.div>
        </Link>

        <Link href={`${basePath}/billing`} className="block group">
          <motion.div initial={false} animate={{ opacity: 1 }} className="glass-card p-6 flex items-center justify-between relative overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-neon-green/10 to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <p className="text-gray-400 font-medium mb-1 text-sm group-hover:text-green-300 transition-colors">Total Collection (This Month)</p>
              <h2 className="text-3xl font-bold text-white tracking-wider"><AnimatedCounter value={data.totalizerCollection} prefix="৳" /></h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-neon-green shadow-[0_0_20px_rgba(57,255,20,0.25)] relative z-10 group-hover:scale-110 transition-transform">
              <DollarSign size={24} />
            </div>
          </motion.div>
        </Link>

        <Link href={`${basePath}/customers?status=unpaid_month`} className="block group">
          <motion.div initial={false} animate={{ opacity: 1 }} className="glass-card p-6 flex items-center justify-between relative overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-neon-red/10 to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <p className="text-gray-400 font-medium mb-1 text-sm group-hover:text-red-300 transition-colors">Due Amount (This Month)</p>
              <h2 className="text-3xl font-bold text-white tracking-wider"><AnimatedCounter value={data.dueAmount} prefix="৳" /></h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-neon-red shadow-[0_0_20px_rgba(255,7,58,0.25)] relative z-10 group-hover:scale-110 transition-transform">
              <AlertTriangle size={24} />
            </div>
          </motion.div>
        </Link>

        <Link href={role === "admin" ? "/admin/expenses" : `${basePath}/reports`} className="block group">
          <motion.div initial={false} animate={{ opacity: 1 }} className="glass-card p-6 flex items-center justify-between relative overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <p className="text-gray-400 font-medium mb-1 text-sm group-hover:text-teal-300 transition-colors">Business Balance (This Month)</p>
              <h2 className="text-3xl font-bold text-white tracking-wider"><AnimatedCounter value={data.businessBalance} prefix="৳" /></h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.25)] relative z-10 group-hover:scale-110 transition-transform">
              <Activity size={24} />
            </div>
          </motion.div>
        </Link>
      </div>
      )}

      {/* Tier 2 Secondary Indicators */}
      {role !== "employee" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href={`${basePath}/billing`} className="block group">
          <motion.div initial={false} animate={{ opacity: 1 }} className="glass-card p-5 flex items-center justify-between relative overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <p className="text-gray-400 font-medium mb-1 text-xs group-hover:text-indigo-300 transition-colors">Today's Collection</p>
              <h2 className="text-2xl font-bold text-white tracking-wider"><AnimatedCounter value={data.todayCollection} prefix="৳" /></h2>
            </div>
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)] relative z-10 group-hover:scale-110 transition-transform">
              <DollarSign size={20} />
            </div>
          </motion.div>
        </Link>

        <Link href={role === "admin" ? "/admin/expenses" : `${basePath}/reports`} className="block group">
          <motion.div initial={false} animate={{ opacity: 1 }} className="glass-card p-5 flex items-center justify-between relative overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <p className="text-gray-400 font-medium mb-1 text-xs group-hover:text-pink-300 transition-colors">Total Expenses (This Month)</p>
              <h2 className="text-2xl font-bold text-white tracking-wider"><AnimatedCounter value={data.totalExpense} prefix="৳" /></h2>
            </div>
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.2)] relative z-10 group-hover:scale-110 transition-transform">
              <DollarSign size={20} />
            </div>
          </motion.div>
        </Link>

        <Link href={`${basePath}/customers`} className="block group">
          <motion.div initial={false} animate={{ opacity: 1 }} className="glass-card p-5 flex items-center justify-between relative overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <p className="text-gray-400 font-medium mb-1 text-xs group-hover:text-yellow-300 transition-colors">Today's Connection Fee</p>
              <h2 className="text-2xl font-bold text-white tracking-wider"><AnimatedCounter value={data.connectionFeeToday} prefix="৳" /></h2>
            </div>
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)] relative z-10 group-hover:scale-110 transition-transform">
              <DollarSign size={20} />
            </div>
          </motion.div>
        </Link>

        <Link href={`${basePath}/customers`} className="block group">
          <motion.div initial={false} animate={{ opacity: 1 }} className="glass-card p-5 flex items-center justify-between relative overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <p className="text-gray-400 font-medium mb-1 text-xs group-hover:text-orange-300 transition-colors">Total Connection Fee</p>
              <h2 className="text-2xl font-bold text-white tracking-wider"><AnimatedCounter value={data.totalConnectionFee} prefix="৳" /></h2>
            </div>
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)] relative z-10 group-hover:scale-110 transition-transform">
              <DollarSign size={20} />
            </div>
          </motion.div>
        </Link>
      </div>
      )}

      {/* MikroTik Resources Widget moved down */}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const cardContent = (
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="glass-card p-5 flex items-center gap-4 hover:-translate-y-1 transition-all cursor-pointer select-none h-full"
              onClick={(stat as any).onClick}
            >
              <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color} shadow-lg ${stat.glow}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white"><AnimatedCounter value={stat.value} /></p>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{stat.name}</p>
              </div>
            </motion.div>
          );
          if (stat.href) {
            return <Link href={stat.href} key={stat.name} className="block">{cardContent}</Link>;
          }
          return <div key={stat.name} className="block" onClick={(stat as any).onClick}>{cardContent}</div>;
        })}
      </div>

      {/* MikroTik Resources Widget moved to the top */}

      {/* Graphs */}
      {role === "admin" && (
        <div className="grid xl:grid-cols-2 gap-6">
          {/* Monthly Income Graph */}
          <div className="glass-card p-6 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Monthly Income Graph</h3>
              <LiveBadge lastUpdated={lastUpdated} />
            </div>
            <div className="h-80 w-full">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyIncomeData}>
                    <defs>
                      <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#00f3ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" tickFormatter={(v) => `৳${Number(v).toLocaleString()}`} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgba(15,23,42,.95)", borderColor: "rgba(255,255,255,.1)", borderRadius: 12 }}
                      formatter={(value: any) => [`৳${Number(value).toLocaleString()}`, "Income"]}
                    />
                    <Area type="linear" dataKey="income" stroke="#00f3ff" strokeWidth={3} fill="url(#income)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-white/5 rounded-xl animate-pulse" />
              )}
            </div>
          </div>

          {/* Download/Upload Graph */}
          <div className="glass-card p-6 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Download size={18} className="text-red-500" /> Customer Download /
                <Upload size={18} className="text-green-500" /> Upload Graph
              </h3>
              <LiveBadge lastUpdated={lastUpdated} />
            </div>
            <div className="h-80 w-full">
              {mounted ? (
                data.dailyUsageData.every(d => d.download === 0 && d.upload === 0) ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-500">
                    <Activity size={40} className="opacity-30" />
                    <p className="text-sm">এখনো কোনো ডেটা ব্যবহার রেকর্ড হয়নি</p>
                    <p className="text-xs text-gray-600">MikroTik sync হলে এখানে data দেখাবে</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailyUsageData}>
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" tickFormatter={(v) => `${Number(v).toFixed(2)} GB`} />
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "rgba(15,23,42,.95)", borderColor: "rgba(255,255,255,.1)", borderRadius: 12 }}
                        formatter={(value: any, name: any) => [`${Number(value).toFixed(3)} GB`, name === "download" ? "Download" : "Upload"]}
                      />
                      <Line type="linear" dataKey="download" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="download" />
                      <Line type="linear" dataKey="upload" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} name="upload" />
                    </LineChart>
                  </ResponsiveContainer>
                )
              ) : (
                <div className="w-full h-full bg-white/5 rounded-xl animate-pulse" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
