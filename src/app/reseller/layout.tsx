"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  Router,
  FileText,
  Settings,
  Megaphone,
  LogOut,
  Menu,
  X,
  Store,
  Bell,
  Loader2,
  LifeBuoy,
  ArrowDownCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";

const nav = [
  { name: "Dashboard", href: "/reseller", icon: LayoutDashboard },
  { name: "Customers", href: "/reseller/customers", icon: Users },
  { name: "Packages", href: "/reseller/packages", icon: Package },
  { name: "Billing", href: "/reseller/billing", icon: CreditCard },
  { name: "MikroTik", href: "/reseller/mikrotik", icon: Router },
  { name: "Notice", href: "/reseller/notices", icon: Megaphone },
  { name: "Support", href: "/reseller/tickets", icon: LifeBuoy },
  { name: "Reports", href: "/reseller/reports", icon: FileText },
  { name: "Settings", href: "/reseller/settings", icon: Settings },
];

export default function ResellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [notifications, setNotifications] = useState<{ id: string; text: string; link: string }[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [resellerProfile, setResellerProfile] = useState<{ name: string; walletBalance: string } | null>(null);

  useEffect(() => {
    // Fetch notifications
    fetch("/api/reseller/notifications")
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

    // Fetch reseller profile info
    fetch("/api/reseller/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setResellerProfile(data);
        }
      })
      .catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login/reseller");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex text-slate-100">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-30 w-64 glass-panel transform transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col border-r border-white/10",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between">
          <span className="text-xl font-bold text-purple-350 flex gap-2 items-center">
            <Store size={22} className="text-purple-400" /> Reseller
          </span>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Reseller Wallet Credit Box */}
        <div className="mx-4 my-3 p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]">
          <div className="text-xs text-gray-400 font-medium">Your Credit</div>
          <div className="text-2xl font-bold text-neon-green font-mono mt-1">
            ৳{resellerProfile ? Number(resellerProfile.walletBalance || 0).toFixed(2) : "0.00"}
          </div>
          <div className="text-xs text-purple-300 font-medium truncate mt-1">
            {resellerProfile?.name || "Loading..."}
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/reseller" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                  active
                    ? "bg-purple-500/20 text-white border border-purple-400/30 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]"
                    : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
                )}
              >
                <item.icon
                  size={20}
                  className={clsx("transition-colors", active ? "text-purple-400" : "group-hover:text-purple-400")}
                />
                <span className="font-medium">{item.name}</span>
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
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="glass-panel h-16 px-4 sm:px-6 lg:px-8 flex items-center sticky top-0 z-10">
          <button className="lg:hidden p-2 mr-2 text-gray-400 hover:bg-white/10 rounded-lg" onClick={() => setOpen(true)}>
            <Menu size={24} />
          </button>

          <div className="flex-1 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-white">
              {nav.find((n) => n.href === pathname)?.name || "Reseller"}
            </h1>
            <div className="flex items-center gap-4 relative">
              <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 hidden sm:block">
                Wallet Based
              </span>

              {/* Header Credit/Balance */}
              <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 px-3.5 py-1.5 rounded-xl">
                <span className="text-xs text-gray-400 font-medium hidden sm:inline">Credit:</span>
                <span className="text-sm font-bold text-purple-300 font-mono">
                  ৳{resellerProfile ? Number(resellerProfile.walletBalance || 0).toFixed(2) : "0.00"}
                </span>
              </div>

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
                        Notifications
                      </h4>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-500 text-center">No new notifications</p>
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

              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/20 cursor-pointer hover:scale-105 transition-transform">
                R
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
          <motion.div initial={false} animate={{ opacity: 1 }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
