"use client";

import Link from "next/link";
import { ArrowRight, Shield, User, Globe, Store, Headphones } from "lucide-react";
import { motion } from "framer-motion";

const portals = [
  { title: "Admin Portal", desc: "Full control over ISP operations, customers, billing, MikroTik, OLT, reports and settings.", href: "/login/admin", cta: "Enter Admin", icon: Shield, iconClass: "text-neon-blue", hover: "group-hover:bg-neon-blue/20 group-hover:border-neon-blue/50", gradient: "from-neon-blue/10" },
  { title: "Customer Portal", desc: "Self-service dashboard for package status, countdown, data usage, payments and complaints.", href: "/login/customer", cta: "My Account", icon: User, iconClass: "text-neon-green", hover: "group-hover:bg-neon-green/20 group-hover:border-neon-green/50", gradient: "from-neon-green/10" },
  { title: "Reseller Panel", desc: "Local sub-provider panel with wallet balance, own customers, recharge, reports and support tickets.", href: "/login/reseller", cta: "Reseller Login", icon: Store, iconClass: "text-purple-400", hover: "group-hover:bg-purple-500/20 group-hover:border-purple-400/50", gradient: "from-purple-500/10" },
  { title: "Employee Panel", desc: "Restricted staff panel for bill collection, complaint handling, MAC update and customer support tasks.", href: "/login/employee", cta: "Employee Login", icon: Headphones, iconClass: "text-orange-400", hover: "group-hover:bg-orange-500/20 group-hover:border-orange-400/50", gradient: "from-orange-500/10" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-blue/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />
      <motion.div initial={false} animate={{ opacity: 1 }} className="text-center mb-6 relative z-10">
        <div className="flex justify-center mb-0 mt-0">
          <div className="w-52 sm:w-64 flex items-center justify-center">
            <img src="/img/logo.png" alt="Rongdhunu DOT Net Logo" className="w-full h-auto drop-shadow-[0_0_20px_rgba(0,243,255,0.5)]" />
          </div>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">Rongdhunu DOT Net <span className="bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-green">ISP Billing</span></h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto font-light mb-6">Admin, reseller, employee and customer portals for complete ISP management.</p>

        {/* Discreet Super Admin portal link - Moved above the cards */}
        <div className="flex justify-center">
          <Link href="/login/superadmin" className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-400/30 text-sm font-bold text-gray-400 hover:text-yellow-400 transition-all shadow-lg hover:shadow-yellow-400/10 backdrop-blur-sm">
            <span>★</span> System Administration Portal (Super Admin)
          </Link>
        </div>
      </motion.div>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 w-full max-w-7xl relative z-10">
        {portals.map((portal, index) => <motion.div key={portal.title} initial={false} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }} className="glass-card p-7 group relative overflow-hidden"><div className={`absolute inset-0 bg-gradient-to-br ${portal.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} /><div className="relative z-10"><div className={`w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 ${portal.iconClass} group-hover:scale-110 transition-transform duration-500`}><portal.icon size={30} /></div><h2 className="text-2xl font-bold text-white mb-3">{portal.title}</h2><p className="text-gray-400 mb-8 min-h-24 leading-relaxed text-sm">{portal.desc}</p><Link href={portal.href} className={`flex items-center justify-between w-full glass-button px-5 py-3 font-semibold text-white ${portal.hover}`}>{portal.cta} <ArrowRight className="group-hover:translate-x-2 transition-transform" /></Link></div></motion.div>)}
      </div>

      {/* Removed from bottom */}
    </div>
  );
}
