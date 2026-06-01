"use client";

import { motion } from "framer-motion";
import { Users, Wifi, WifiOff, Clock, DollarSign, Activity, AlertTriangle, Router, RadioTower, Download, Upload, CalendarCheck } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useEffect, useState } from "react";
import Link from "next/link";

function AnimatedCounter({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = isNaN(value) ? 0 : Math.max(0, value);
    if (end === 0) {
      setCount(0);
      return;
    }
    const timer = setInterval(() => {
      start += Math.max(1, Math.ceil(end / 18));
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 35);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{count.toLocaleString()}</span>;
}

const incomeData = [
  { name: "Jan", income: 12000 }, { name: "Feb", income: 15500 }, { name: "Mar", income: 14200 },
  { name: "Apr", income: 18200 }, { name: "May", income: 22000 }, { name: "Jun", income: 24500 },
  { name: "Jul", income: 28000 },
];

const usageData = [
  { name: "Sat", download: 240, upload: 80 }, { name: "Sun", download: 320, upload: 100 },
  { name: "Mon", download: 280, upload: 95 }, { name: "Tue", download: 390, upload: 125 },
  { name: "Wed", download: 420, upload: 150 }, { name: "Thu", download: 380, upload: 130 },
  { name: "Fri", download: 470, upload: 170 },
];

export default function AdminDashboardClient({
  role = "admin",
  ...props
}: {
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
}) {
  const todayCollection = props.todayCollection ?? 0;
  const expectedCollection = props.expectedCollection ?? 0;
  const paidThisMonthCount = props.paidThisMonthCount ?? 0;
  const unpaidThisMonthCount = props.unpaidThisMonthCount ?? 0;
  const connectionFeeToday = props.connectionFeeToday ?? 0;
  const totalConnectionFee = props.totalConnectionFee ?? 0;
  const businessBalance = props.businessBalance ?? 0;
  const totalExpense = props.totalExpense ?? 0;

  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [offlineCount, setOfflineCount] = useState<number | null>(null);
  const [activeModal, setActiveModal] = useState<"today_expire" | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const downloadCSV = (title: string, data: any[]) => {
    const headers = ["Name", "Phone", "PPPoE Username", "Package", "Created At", "Expire Date"];
    const rows = data.map(u => [
      u.name,
      u.phone,
      u.pppoeUsername || "N/A",
      u.package?.name || "No Plan",
      u.createdAt ? new Date(u.createdAt).toLocaleString() : "N/A",
      u.expireDate ? new Date(u.expireDate).toLocaleString() : "N/A"
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const basePath = role === "reseller" ? "/reseller" : role === "employee" ? "/employee" : "/admin";

  useEffect(() => {
    const fetchStatus = () => {
      fetch("/api/admin/dashboard/active-status")
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.onlineCustomers === "number") {
            setOnlineCount(data.onlineCustomers);
          }
          if (typeof data.offlineCustomers === "number") {
            setOfflineCount(data.offlineCustomers);
          }
        })
        .catch((err) => {
          console.error("Failed to load active status client-side:", err);
          setOnlineCount((prev) => (prev !== null ? prev : 0));
          setOfflineCount((prev) => (prev !== null ? prev : props.activeCustomers));
        });
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // Poll every 15 seconds for real-time counts
    return () => clearInterval(interval);
  }, [props.activeCustomers]);

  const stats = [
    { name: "Total Customer", value: props.totalCustomers, icon: Users, color: "text-blue-400", glow: "shadow-blue-500/40", href: `${basePath}/customers` },
    { name: "Active Customer", value: props.activeCustomers, icon: Wifi, color: "text-neon-green", glow: "shadow-green-500/40", href: `${basePath}/customers?status=active` },
    { name: "Online Customer", value: onlineCount !== null ? onlineCount : 0, icon: Activity, color: "text-teal-300", glow: "shadow-teal-500/40", href: `${basePath}/customers?status=online` },
    { name: "Offline Customer", value: offlineCount !== null ? offlineCount : props.activeCustomers, icon: WifiOff, color: "text-neon-red", glow: "shadow-red-500/40", href: `${basePath}/customers?status=offline` },
    { name: "Expired Customer", value: props.expiredCustomers, icon: Clock, color: "text-orange-400", glow: "shadow-orange-500/40", href: `${basePath}/customers?status=expired` },
    
    // New month collection / paid status stats
    { name: "Paid Customer (Month)", value: paidThisMonthCount, icon: Users, color: "text-emerald-400", glow: "shadow-emerald-500/40", href: `${basePath}/customers?status=paid_month` },
    { name: "Unpaid Customer (Month)", value: unpaidThisMonthCount, icon: Users, color: "text-rose-400", glow: "shadow-rose-500/40", href: `${basePath}/customers?status=unpaid_month` },

    // New clickable card triggers
    { name: "Running Month New User", value: props.newCustomersThisMonth?.length || 0, icon: Users, color: "text-indigo-400", glow: "shadow-indigo-500/40", href: `${basePath}/customers?status=new_month` },
    { name: "Today Expire", value: props.expiringToday?.length || 0, icon: Clock, color: "text-pink-400", glow: "shadow-pink-500/40", onClick: () => setActiveModal("today_expire") },

    { name: "1 Day Expired", value: props.expired1Day, icon: AlertTriangle, color: "text-red-300", glow: "shadow-red-400/40", href: `${basePath}/customers?status=expired` },
    { name: "2 Day Expired", value: props.expired2Day, icon: AlertTriangle, color: "text-red-400", glow: "shadow-red-500/40", href: `${basePath}/customers?status=expired` },
    { name: "3 Day Expired", value: props.expired3Day, icon: AlertTriangle, color: "text-red-500", glow: "shadow-red-600/40", href: `${basePath}/customers?status=expired` },
    { name: "4 Day Expired", value: props.expired4Day, icon: AlertTriangle, color: "text-red-600", glow: "shadow-red-700/40", href: `${basePath}/customers?status=expired` },
    { name: "Today Recharge", value: props.todayRecharge, icon: CalendarCheck, color: "text-neon-blue", glow: "shadow-cyan-500/40", href: `${basePath}/billing` },
    { name: "Upcoming Expire", value: props.upcomingExpires, icon: Clock, color: "text-yellow-400", glow: "shadow-yellow-500/40", href: `${basePath}/customers?status=upcoming` },
    ...(role !== "reseller" ? [
      { name: "Router Added", value: props.routerCount, icon: Router, color: "text-purple-300", glow: "shadow-purple-500/40", href: `${basePath}/mikrotik` },
      { name: "OLT Added", value: props.oltCount, icon: RadioTower, color: "text-pink-300", glow: "shadow-pink-500/40", href: `${basePath}/mikrotik` },
    ] : []),
  ];

  return (
    <div className="space-y-8">
      {/* Tier 1 Primary Financial Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href={`${basePath}/customers?status=unpaid_month`} className="block group">
          <motion.div initial={false} animate={{ opacity: 1 }} className="glass-card p-6 flex items-center justify-between relative overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <p className="text-gray-400 font-medium mb-1 text-sm group-hover:text-blue-300 transition-colors">Expected Collection</p>
              <h2 className="text-3xl font-bold text-white tracking-wider"><AnimatedCounter value={expectedCollection} prefix="৳" /></h2>
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
              <h2 className="text-3xl font-bold text-white tracking-wider"><AnimatedCounter value={props.totalizerCollection} prefix="৳" /></h2>
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
              <h2 className="text-3xl font-bold text-white tracking-wider"><AnimatedCounter value={props.dueAmount} prefix="৳" /></h2>
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
              <h2 className="text-3xl font-bold text-white tracking-wider"><AnimatedCounter value={businessBalance} prefix="৳" /></h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.25)] relative z-10 group-hover:scale-110 transition-transform">
              <Activity size={24} />
            </div>
          </motion.div>
        </Link>
      </div>

      {/* Tier 2 Secondary Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href={`${basePath}/billing`} className="block group">
          <motion.div initial={false} animate={{ opacity: 1 }} className="glass-card p-5 flex items-center justify-between relative overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <p className="text-gray-400 font-medium mb-1 text-xs group-hover:text-indigo-300 transition-colors">Today's Collection</p>
              <h2 className="text-2xl font-bold text-white tracking-wider"><AnimatedCounter value={todayCollection} prefix="৳" /></h2>
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
              <h2 className="text-2xl font-bold text-white tracking-wider"><AnimatedCounter value={totalExpense} prefix="৳" /></h2>
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
              <h2 className="text-2xl font-bold text-white tracking-wider"><AnimatedCounter value={connectionFeeToday} prefix="৳" /></h2>
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
              <h2 className="text-2xl font-bold text-white tracking-wider"><AnimatedCounter value={totalConnectionFee} prefix="৳" /></h2>
            </div>
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)] relative z-10 group-hover:scale-110 transition-transform">
              <DollarSign size={20} />
            </div>
          </motion.div>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const cardContent = (
            <motion.div 
              initial={false} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: index * 0.03 }} 
              className="glass-card p-5 flex items-center gap-4 hover:-translate-y-1 transition-all cursor-pointer select-none h-full"
              onClick={stat.onClick}
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
            return (
              <Link href={stat.href} key={stat.name} className="block">
                {cardContent}
              </Link>
            );
          }

          return (
            <div key={stat.name} className="block" onClick={stat.onClick}>
              {cardContent}
            </div>
          );
        })}
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="glass-card p-6 min-w-0 overflow-hidden">
          <h3 className="text-xl font-semibold text-white mb-6">Monthly Income Graph</h3>
          <div className="h-80 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={props.monthlyIncomeData || []}>
                  <defs><linearGradient id="income" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00f3ff" stopOpacity={0.35}/><stop offset="95%" stopColor="#00f3ff" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" tickFormatter={(v) => `৳${v.toLocaleString()}`} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(15,23,42,.95)", borderColor: "rgba(255,255,255,.1)", borderRadius: 12 }} 
                    formatter={(value: any) => [`৳${Number(value).toLocaleString()}`, "Income"]}
                  />
                  <Area type="monotone" dataKey="income" stroke="#00f3ff" strokeWidth={3} fill="url(#income)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-white/5 rounded-xl animate-pulse" />
            )}
          </div>
        </div>

        <div className="glass-card p-6 min-w-0 overflow-hidden">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2"><Download size={18} className="text-neon-green" /> Customer Download / <Upload size={18} className="text-neon-blue" /> Upload Graph</h3>
          <div className="h-80 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={props.dailyUsageData || []}>
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" tickFormatter={(v) => `${v} GB`} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(15,23,42,.95)", borderColor: "rgba(255,255,255,.1)", borderRadius: 12 }} 
                    formatter={(value: any, name: any) => [`${value} GB`, name === "download" ? "Download" : "Upload"]}
                  />
                  <Line type="monotone" dataKey="download" stroke="#39ff14" strokeWidth={3} dot={{ r: 4 }} name="download" />
                  <Line type="monotone" dataKey="upload" stroke="#00f3ff" strokeWidth={3} dot={{ r: 4 }} name="upload" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-white/5 rounded-xl animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Clickable Card Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-white/10"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-bold text-white tracking-wide">
                Today Expiring Users
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-white px-3 py-1 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors font-bold text-sm"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <span className="text-gray-300 font-medium">
                  Total Users Found: <span className="text-neon-blue font-bold">{props.expiringToday?.length || 0}</span>
                </span>
                <button
                  onClick={() => {
                    downloadCSV("Today Expiring Users", props.expiringToday || []);
                  }}
                  className="bg-neon-blue/20 text-neon-blue border border-neon-blue/40 hover:bg-neon-blue/30 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Download size={14} /> Download CSV List
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider">
                      <th className="p-4">Customer</th>
                      <th className="p-4">PPPoE / Plan</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4">Expire Date</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {(props.expiringToday || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">No users found.</td>
                      </tr>
                    ) : (
                      (props.expiringToday || []).map((user: any) => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors text-xs sm:text-sm">
                          <td className="p-4">
                            <Link href={`/admin/customers/${user.id}`} className="font-bold text-white hover:text-neon-blue block">
                              {user.name}
                            </Link>
                            <span className="text-gray-400 text-xs">{user.phone}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-gray-300 block">{user.pppoeUsername || "N/A"}</span>
                            <span className="text-neon-blue text-xs font-semibold">{user.package?.name || "No Plan"}</span>
                          </td>
                          <td className="p-4 text-gray-300 font-mono text-xs">
                            {user.createdAt ? new Date(user.createdAt).toLocaleString() : "N/A"}
                          </td>
                          <td className="p-4 text-gray-300 font-mono text-xs">
                            {user.expireDate ? new Date(user.expireDate).toLocaleString() : "N/A"}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              user.status === "active" ? "bg-neon-green/10 text-neon-green" : "bg-red-500/10 text-red-400"
                            }`}>
                              {user.status || "offline"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
