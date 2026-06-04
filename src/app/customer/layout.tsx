"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, CreditCard, History, LifeBuoy, User,
  LogOut, Menu, X, Loader2, Bell, TrendingUp, Megaphone,
} from "lucide-react";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import NoticePopup from "./NoticePopup";
import AvatarImage from "@/components/ui/AvatarImage";

const navigation = [
  { name: "My Account", href: "/customer", icon: LayoutDashboard },
  { name: "Profile", href: "/customer/profile", icon: User },
  { name: "Pay Bill", href: "/customer/pay-bill", icon: CreditCard },
  { name: "Package Change", href: "/customer/package-change", icon: TrendingUp },
  { name: "Notices", href: "/customer/notices", icon: Megaphone },
  { name: "History", href: "/customer/history", icon: History },
  { name: "Support", href: "/customer/support", icon: LifeBuoy },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; text: string; link: string }[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<{ name: string; photoUrl: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/customer/me").then(r => r.json()).then(data => {
      if (data?.name) setCustomerInfo(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/customer/notifications").then(r => r.json()).then(data => {
      if (Array.isArray(data)) { setNotifications(data); if (data.length > 0) setHasUnread(true); }
    }).catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login/customer");
    router.refresh();
  }

  const pageTitle = navigation.find(n => n.href === pathname)?.name || "Dashboard";

  return (
    <div className="min-h-screen flex text-slate-100 w-full" style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b27 100%)" }}>
      <NoticePopup />
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <div className={clsx(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )} style={{ width: 210, background: "#0d1117", borderColor: "rgba(255,255,255,0.06)" }}>

        <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <div className="text-base font-extrabold tracking-tight" style={{ color: "#39ff14", letterSpacing: "-0.02em" }}>ISP Portal</div>
            <div className="text-[10px] font-semibold mt-0.5" style={{ color: "#16a34a" }}>◉ Customer Panel</div>
          </div>
          <button className="lg:hidden text-gray-500 hover:text-white" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>

        {/* Customer info chip */}
        {customerInfo && (
          <div className="mx-3 my-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5" style={{ background: "rgba(57,255,20,0.07)", border: "1px solid rgba(57,255,20,0.15)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden"
              style={{ background: "linear-gradient(135deg, #16a34a, #39ff14)" }}>
              <AvatarImage src={customerInfo.photoUrl} fallbackText={customerInfo.name.charAt(0).toUpperCase()} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-white truncate">{customerInfo.name}</div>
              <div className="text-[9px] font-bold" style={{ color: "#39ff14" }}>Customer</div>
            </div>
          </div>
        )}

        <nav className="flex-1 px-2 py-2 overflow-y-auto custom-scrollbar space-y-0.5">
          {navigation.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href} onClick={() => setSidebarOpen(false)}
                className={clsx("flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 group",
                  isActive ? "text-white" : "text-gray-400 hover:text-gray-200")}
                style={isActive ? { background: "rgba(57,255,20,0.08)", borderLeft: "2px solid #39ff14" } : {}}>
                <item.icon size={16} className={isActive ? "text-green-400" : "text-gray-500 group-hover:text-gray-300"} />
                <span className="text-[12px] font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button onClick={handleLogout} disabled={loggingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-red-400 hover:text-red-300 disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.05)" }}>
            {loggingOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
            <span className="text-[12px] font-semibold">{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-12 flex items-center px-4 sm:px-5 shrink-0 sticky top-0 z-10"
          style={{ background: "#111827", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button className="lg:hidden p-1.5 mr-2 text-gray-400 hover:text-white rounded-md" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1 flex justify-between items-center">
            <h1 className="text-sm font-bold text-gray-200 tracking-wide">{pageTitle}</h1>
            <div className="flex items-center gap-2">
              <div className="relative z-50">
                <button onClick={() => { setShowNotif(!showNotif); if (!showNotif) setHasUnread(false); }}
                  className="p-1.5 rounded-md text-gray-400 hover:text-white relative transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Bell size={16} />
                  {hasUnread && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
                </button>
                <AnimatePresence>
                  {showNotif && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-full mt-1 w-72 rounded-xl shadow-2xl overflow-hidden py-1 z-50"
                      style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <h4 className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase border-b border-white/5">Notifications / ঘোষণা</h4>
                      {notifications.length === 0 ? <p className="px-4 py-3 text-xs text-gray-500 text-center">কোনো নতুন নোটিফিকেশন নেই</p>
                        : notifications.map(n => <Link key={n.id} href={n.link} onClick={() => setShowNotif(false)} className="block px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/5 border-b border-white/5 last:border-b-0">{n.text}</Link>)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0"
                style={{ background: "linear-gradient(135deg, #16a34a, #39ff14)" }}>
                {customerInfo ? (
                  <AvatarImage src={customerInfo.photoUrl} fallbackText={customerInfo.name.charAt(0).toUpperCase()} />
                ) : "C"}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
