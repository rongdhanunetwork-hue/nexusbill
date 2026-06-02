"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  CreditCard, 
  History, 
  LifeBuoy, 
  User,
  KeyRound,
  LogOut,
  Menu,
  X,
  Loader2,
  Bell,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import NoticePopup from "./NoticePopup";

const navigation = [
  { name: 'My Account', href: '/customer', icon: LayoutDashboard },
  { name: 'Profile', href: '/customer/profile', icon: User },
  { name: 'Pay Bill', href: '/customer/pay-bill', icon: CreditCard },
  { name: 'Package Change', href: '/customer/package-change', icon: TrendingUp },
  { name: 'History', href: '/customer/history', icon: History },
  { name: 'Support', href: '/customer/support', icon: LifeBuoy },
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
    fetch("/api/customer/me")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.name) {
          setCustomerInfo(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/customer/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
          if (data.length > 0) {
            setHasUnread(true);
          }
        }
      })
      .catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login/customer");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex text-slate-100">
      <NoticePopup />
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={clsx(
        "fixed inset-y-0 left-0 z-30 w-64 glass-panel transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto flex flex-col border-r-white/10",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-green to-teal-400">
            ISP Portal
          </span>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "text-white bg-white/10 shadow-[inset_0_0_20px_rgba(57,255,20,0.1)] border border-white/10" 
                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <item.icon size={20} className={clsx(
                  "transition-colors duration-300",
                  isActive ? "text-neon-green" : "group-hover:text-neon-green"
                )} />
                <span className="font-medium relative z-10">{item.name}</span>
                {isActive && (
                  <motion.div 
                    layoutId="active-customer-nav" 
                    className="absolute inset-0 bg-gradient-to-r from-neon-green/10 to-transparent opacity-50 pointer-events-none" 
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-neon-red transition-all duration-200 border border-transparent hover:border-red-500/20 disabled:opacity-50"
          >
            {loggingOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
            <span className="font-medium">{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <header className="glass-panel border-b-white/10 h-16 flex items-center px-4 sm:px-6 lg:px-8 shrink-0 sticky top-0 z-10">
          <button 
            className="lg:hidden p-2 -ml-2 mr-2 text-gray-400 hover:bg-white/10 rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="flex-1 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-white tracking-wide">
              {navigation.find(n => n.href === pathname)?.name || 'Dashboard'}
            </h1>
            <div className="flex items-center gap-4 relative">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotif(!showNotif);
                    if (!showNotif) setHasUnread(false);
                  }}
                  className="p-2 text-gray-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 relative transition-colors"
                >
                  <Bell size={20} />
                  {hasUnread && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
                  )}
                </button>
                <AnimatePresence>
                  {showNotif && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden py-2 z-50 text-left"
                    >
                      <h4 className="px-4 py-2 text-xs font-bold text-gray-400 uppercase border-b border-white/5 mb-1">
                        Notifications / ঘোষণা
                      </h4>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-500 text-center">কোনো নতুন নোটিফিকেশন নেই</p>
                      ) : (
                        notifications.map((n) => (
                          <Link
                            key={n.id}
                            href={n.link}
                            onClick={() => setShowNotif(false)}
                            className="block px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                          >
                            {n.text}
                          </Link>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {customerInfo?.photoUrl ? (
                <img 
                  src={customerInfo.photoUrl} 
                  alt={customerInfo.name} 
                  className="w-10 h-10 rounded-full object-cover shadow-lg border border-white/10 hover:scale-105 transition-transform cursor-pointer" 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-neon-green to-teal-500 flex items-center justify-center text-white font-bold shadow-lg shadow-neon-green/20 cursor-pointer hover:scale-105 transition-transform">
                  {customerInfo ? customerInfo.name.charAt(0).toUpperCase() : "C"}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
