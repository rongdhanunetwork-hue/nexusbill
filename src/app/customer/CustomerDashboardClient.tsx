"use client";

import { motion } from "framer-motion";
import { Package, CreditCard, Clock, AlertTriangle, ChevronRight, Megaphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CustomerDashboardClient({
  customerName,
  packageName,
  packageSpeed,
  expireDate,
  billStatus,
  dueAmount,
  noticeTitle,
  noticeMessage,
}: {
  customerName: string;
  packageName: string;
  packageSpeed: string;
  expireDate: string | null;
  billStatus: string;
  dueAmount: number;
  noticeTitle: string | null;
  noticeMessage: string | null;
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

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <motion.div initial={false} animate={{ opacity: 1 }} className="relative overflow-hidden rounded-3xl p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-green/20 via-teal-500/20 to-blue-500/20 backdrop-blur-3xl" />
        <div className="relative z-10"><h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Welcome, <span className="bg-clip-text text-transparent bg-gradient-to-r from-neon-green to-teal-400">{customerName}</span></h2><p className="text-gray-300 text-lg">Your connection is <span className="text-neon-green font-semibold">Active</span></p></div>
      </motion.div>

      {daysRemaining !== null && daysRemaining <= 3 && (
        <div className="glass-card p-5 border-orange-500/40 bg-orange-500/5 flex gap-3 items-center">
          <AlertTriangle className="text-orange-400 shrink-0 animate-bounce" size={24} />
          <div className="flex-1">
            <h3 className="font-bold text-white">প্যাকেজ মেয়াদ শেষ হওয়ার সতর্কতা!</h3>
            <p className="text-gray-300 text-sm mt-0.5">
              আপনার ইন্টারনেট কানেকশনের মেয়াদ আর মাত্র <span className="text-orange-400 font-bold">{daysRemaining} দিন</span> বাকি আছে। সচল রাখতে দ্রুত রিচার্জ করুন।
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

      <div className="glass-card p-6 md:p-8">
        <h3 className="text-xl font-semibold text-white mb-6">Data Usage Statistics</h3>
        <div className="grid grid-cols-7 gap-2 h-36 items-end mb-3">
          {[45, 70, 55, 85, 62, 90, 78].map((height, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <div className="w-full rounded-t-lg bg-gradient-to-t from-neon-green/30 to-neon-blue/80" style={{ height: `${height}%` }} />
              <span className="text-xs text-gray-500">D{index + 1}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-400">Graphical download/upload usage overview from recent sessions.</p>
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
