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
    const end = Math.max(0, value);
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

export default function AdminDashboardClient(props: {
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
  totalizerCollection: number;
  dueAmount: number;
  routerCount: number;
  oltCount: number;
  upcomingExpires: number;
}) {
  const stats = [
    { name: "Total Customer", value: props.totalCustomers, icon: Users, color: "text-blue-400", glow: "shadow-blue-500/40", href: "/admin/customers" },
    { name: "Active Customer", value: props.activeCustomers, icon: Wifi, color: "text-neon-green", glow: "shadow-green-500/40", href: "/admin/customers?status=active" },
    { name: "Online Customer", value: props.onlineCustomers, icon: Activity, color: "text-teal-300", glow: "shadow-teal-500/40", href: "/admin/customers?status=online" },
    { name: "Offline Customer", value: props.offlineCustomers, icon: WifiOff, color: "text-neon-red", glow: "shadow-red-500/40", href: "/admin/customers?status=offline" },
    { name: "Expired Customer", value: props.expiredCustomers, icon: Clock, color: "text-orange-400", glow: "shadow-orange-500/40", href: "/admin/customers?status=expired" },
    { name: "1 Day Expired", value: props.expired1Day, icon: AlertTriangle, color: "text-red-300", glow: "shadow-red-400/40", href: "/admin/customers?status=expired" },
    { name: "2 Day Expired", value: props.expired2Day, icon: AlertTriangle, color: "text-red-400", glow: "shadow-red-500/40", href: "/admin/customers?status=expired" },
    { name: "3 Day Expired", value: props.expired3Day, icon: AlertTriangle, color: "text-red-500", glow: "shadow-red-600/40", href: "/admin/customers?status=expired" },
    { name: "4 Day Expired", value: props.expired4Day, icon: AlertTriangle, color: "text-red-600", glow: "shadow-red-700/40", href: "/admin/customers?status=expired" },
    { name: "Today Recharge", value: props.todayRecharge, icon: CalendarCheck, color: "text-neon-blue", glow: "shadow-cyan-500/40", href: "/admin/billing" },
    { name: "Upcoming Expire", value: props.upcomingExpires, icon: Clock, color: "text-yellow-400", glow: "shadow-yellow-500/40", href: "/admin/customers?status=upcoming" },
    { name: "Router Added", value: props.routerCount, icon: Router, color: "text-purple-300", glow: "shadow-purple-500/40", href: "/admin/mikrotik" },
    { name: "OLT Added", value: props.oltCount, icon: RadioTower, color: "text-pink-300", glow: "shadow-pink-500/40", href: "/admin/mikrotik" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={false} animate={{ opacity: 1 }} className="glass-card p-8 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-green/10 to-transparent opacity-70" />
          <div className="relative z-10">
            <p className="text-gray-400 font-medium mb-1">Totalizer Collection</p>
            <h2 className="text-4xl font-bold text-white tracking-wider"><AnimatedCounter value={props.totalizerCollection} prefix="৳" /></h2>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-neon-green shadow-[0_0_20px_rgba(57,255,20,0.25)] relative z-10">
            <DollarSign size={32} />
          </div>
        </motion.div>

        <motion.div initial={false} animate={{ opacity: 1 }} className="glass-card p-8 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-red/10 to-transparent opacity-70" />
          <div className="relative z-10">
            <p className="text-gray-400 font-medium mb-1">Due Amount</p>
            <h2 className="text-4xl font-bold text-white tracking-wider"><AnimatedCounter value={props.dueAmount} prefix="৳" /></h2>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-neon-red shadow-[0_0_20px_rgba(255,7,58,0.25)] relative z-10">
            <AlertTriangle size={32} />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Link href={stat.href} key={stat.name} className="block">
            <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="glass-card p-5 flex items-center gap-4 hover:-translate-y-1 transition-all cursor-pointer select-none">
              <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color} shadow-lg ${stat.glow}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white"><AnimatedCounter value={stat.value} /></p>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{stat.name}</p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Monthly Income Graph</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={incomeData}>
                <defs><linearGradient id="income" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00f3ff" stopOpacity={0.35}/><stop offset="95%" stopColor="#00f3ff" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="name" stroke="#9ca3af" /><YAxis stroke="#9ca3af" />
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <Tooltip contentStyle={{ backgroundColor: "rgba(15,23,42,.95)", borderColor: "rgba(255,255,255,.1)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="income" stroke="#00f3ff" strokeWidth={3} fill="url(#income)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2"><Download size={18} className="text-neon-green" /> Customer Download / <Upload size={18} className="text-neon-blue" /> Upload Graph</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData}>
                <XAxis dataKey="name" stroke="#9ca3af" /><YAxis stroke="#9ca3af" />
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <Tooltip contentStyle={{ backgroundColor: "rgba(15,23,42,.95)", borderColor: "rgba(255,255,255,.1)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="download" stroke="#39ff14" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="upload" stroke="#00f3ff" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
